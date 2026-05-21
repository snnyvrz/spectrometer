import asyncio
from datetime import datetime
import logging
from pathlib import Path

import pandas as pd

from .schemas import SpectrumData

BASE_DIR = Path(__file__).parent.parent.parent
CSV_FILE_PATH = BASE_DIR / "spectra.csv"


class SpectrometerSimulator:
    def __init__(self):
        self.logger = self._setup_logger()
        self.data = self._load_csv()
        self.current_index: int = 0
        self.current_timestamp: datetime = self.data[self.current_index].timestamp
        self.current_spectrum: list[float] = self.data[self.current_index].spectrum
        self.running: bool = False
        self._running_event = asyncio.Event()
        self._lock = asyncio.Lock()
        self._subscribers: set[asyncio.Queue] = set()
        self._subscribers_lock = asyncio.Lock()

    async def _broadcast_update(self) -> None:
        timestamp, index, spectrum = await self.get_latest_state()

        payload = {
            "timestamp": timestamp.isoformat(),
            "index": index,
            "spectrum": spectrum,
        }

        async with self._subscribers_lock:
            subscribers = list(self._subscribers)

        for queue in subscribers:
            if queue.full():
                try:
                    queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass

            queue.put_nowait(payload)

    def _load_csv(self) -> list[SpectrumData]:
        """Load the CSV file and return a list of SpectrumData objects."""

        try:
            raw_data = pd.read_csv(CSV_FILE_PATH)
        except FileNotFoundError:
            self.logger.error(
                f"CSV file not found. Please ensure '{CSV_FILE_PATH}' is in the correct directory."
            )
            raise SystemExit(1)

        timestamp_column = raw_data.columns[0]
        spectrum_columns = raw_data.columns[1:]

        data = []
        for _, row in raw_data.iterrows():
            timestamp = datetime.fromisoformat(row[timestamp_column])
            spectrum = [float(row[col]) for col in spectrum_columns]
            data.append(SpectrumData(timestamp=timestamp, spectrum=spectrum))

        return data

    def _setup_logger(self) -> logging.Logger:
        logger = logging.getLogger("SimulationLogger")
        logger.setLevel(logging.DEBUG)
        ch = logging.StreamHandler()
        ch.setLevel(logging.DEBUG)
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        ch.setFormatter(formatter)
        if not logger.handlers:
            logger.addHandler(ch)
        return logger

    def _get_sleep_time(self, current_index: int, current_timestamp: datetime) -> float:
        """Calculate the time to sleep until the next timestamp."""

        next_index = (current_index + 1) % len(self.data)

        if next_index == 0:
            return 1.0

        next_timestamp = self.data[next_index].timestamp
        return (next_timestamp - current_timestamp).total_seconds()

    async def get_latest_spectrum(self) -> list[float]:
        async with self._lock:
            return list(self.current_spectrum)

    async def get_latest_timestamp(self) -> datetime:
        async with self._lock:
            return self.current_timestamp

    async def get_latest_state(self) -> tuple[datetime, int, list[float]]:
        async with self._lock:
            return (
                self.current_timestamp,
                self.current_index,
                list(self.current_spectrum),
            )

    def get_timestamps(self) -> list[datetime]:
        return [data.timestamp for data in self.data]

    async def get_index(self) -> int:
        async with self._lock:
            return self.current_index

    async def set_timestamp(self, timestamp: datetime):
        if timestamp in self.get_timestamps():
            index = next(
                i for i, data in enumerate(self.data) if data.timestamp == timestamp
            )
            spectrum = self.data[index].spectrum

            async with self._lock:
                self.current_timestamp = timestamp
                self.current_index = index
                self.current_spectrum = spectrum

            self.logger.debug(f"Timestamp set to: {timestamp}")
            await self._broadcast_update()
        else:
            raise ValueError(f"Timestamp {timestamp} not found in data.")

    async def set_index(self, index: int):
        current_index = index % len(self.data)
        spectrum_data = self.data[current_index]

        async with self._lock:
            self.current_index = current_index
            self.current_timestamp = spectrum_data.timestamp
            self.current_spectrum = spectrum_data.spectrum

        self.logger.debug(f"Index set to: {current_index}")
        await self._broadcast_update()

    async def start(self):
        async with self._lock:
            if self.running:
                raise ValueError("Simulation is already running.")
            self.running = True
        self._running_event.set()

    async def stop(self):
        async with self._lock:
            if not self.running:
                raise ValueError("Simulation is already stopped.")
            self.running = False
        self._running_event.clear()

    async def run(self):
        try:
            while True:
                async with self._lock:
                    running = self.running

                if not running:
                    await self._running_event.wait()
                    continue

                async with self._lock:
                    spectrum_data = self.data[self.current_index]
                    self.current_timestamp = spectrum_data.timestamp
                    self.current_spectrum = spectrum_data.spectrum
                    current_index = self.current_index
                    current_timestamp = self.current_timestamp
                    sleep_time = self._get_sleep_time(current_index, current_timestamp)

                self.logger.debug(f"Updated to timestamp: {current_timestamp}")
                await self._broadcast_update()
                await asyncio.sleep(sleep_time)

                async with self._lock:
                    self.current_index = (self.current_index + 1) % len(self.data)
        except asyncio.CancelledError:
            self.logger.info("Simulation run cancelled.")
        finally:
            self.logger.info("Simulation stopped.")

    async def subscribe(self) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue(maxsize=1)

        async with self._subscribers_lock:
            self._subscribers.add(queue)

        timestamp, index, spectrum = await self.get_latest_state()

        queue.put_nowait(
            {
                "timestamp": timestamp.isoformat(),
                "index": index,
                "spectrum": spectrum,
            }
        )

        return queue

    async def unsubscribe(self, queue: asyncio.Queue) -> None:
        async with self._subscribers_lock:
            self._subscribers.discard(queue)
