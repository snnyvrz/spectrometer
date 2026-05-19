import asyncio
from datetime import datetime
import logging
from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).parent.parent.parent
CSV_FILE_PATH = BASE_DIR / "spectra.csv"


class SpectrometerSimulator:
    def __init__(self):
        self.logger = self._setup_logger()
        self.data: pd.DataFrame = self._load_csv()
        self.current_index: int = 0
        self.current_timestamp: datetime = self.data.iloc[self.current_index][
            "timestamp"
        ]
        self.current_spectrum: list[float] = self.data.iloc[self.current_index][
            "spectrum"
        ]
        self.running: bool = False
        self._running_event = asyncio.Event()
        self._update_event = asyncio.Event()
        self._lock = asyncio.Lock()

    def _load_csv(self) -> pd.DataFrame:
        """Load the CSV file and return a DataFrame with 'timestamp' and 'spectrum' columns."""

        try:
            raw_data = pd.read_csv(CSV_FILE_PATH)
        except FileNotFoundError:
            self.logger.error(
                f"CSV file not found. Please ensure '{CSV_FILE_PATH}' is in the correct directory."
            )
            raise SystemExit(1)

        timestamp_column = raw_data.columns[0]
        spectrum_columns = raw_data.columns[1:]

        return pd.DataFrame(
            {
                "timestamp": pd.to_datetime(raw_data[timestamp_column]),
                "spectrum": raw_data[spectrum_columns].values.tolist(),
            }
        )

    def _setup_logger(self) -> logging.Logger:
        logger = logging.getLogger("SimulationLogger")
        logger.setLevel(logging.DEBUG)
        ch = logging.StreamHandler()
        ch.setLevel(logging.DEBUG)
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        ch.setFormatter(formatter)
        logger.addHandler(ch)
        return logger

    def _get_sleep_time(self, current_index: int, current_timestamp: datetime) -> float:
        """Calculate the time to sleep until the next timestamp."""

        next_index = (current_index + 1) % len(self.data)

        if next_index == 0:
            return 1.0

        next_timestamp = self.data.iloc[next_index]["timestamp"]
        return (next_timestamp - current_timestamp).total_seconds()

    def _trigger_update(self):
        self._update_event.set()
        self._update_event.clear()

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
        return self.data["timestamp"].tolist()

    async def get_index(self) -> int:
        async with self._lock:
            return self.current_index

    async def set_timestamp(self, timestamp: datetime):
        if timestamp in self.get_timestamps():
            index = self.data.index[self.data["timestamp"] == timestamp][0]
            spectrum = self.data.iloc[index]["spectrum"]

            async with self._lock:
                self.current_timestamp = timestamp
                self.current_index = index
                self.current_spectrum = spectrum

            self.logger.debug(f"Timestamp set to: {timestamp}")
            self._trigger_update()
        else:
            raise ValueError(f"Timestamp {timestamp} not found in data.")

    async def set_index(self, index: int):
        current_index = index % len(self.data)
        row = self.data.iloc[current_index]

        async with self._lock:
            self.current_index = current_index
            self.current_timestamp = row["timestamp"]
            self.current_spectrum = row["spectrum"]

        self.logger.debug(f"Index set to: {current_index}")
        self._trigger_update()

    async def start(self):
        async with self._lock:
            self.running = True
        self._running_event.set()

    async def stop(self):
        async with self._lock:
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
                    row = self.data.iloc[self.current_index]
                    self.current_timestamp = row["timestamp"]
                    self.current_spectrum = row["spectrum"]
                    current_index = self.current_index
                    current_timestamp = self.current_timestamp
                    sleep_time = self._get_sleep_time(current_index, current_timestamp)

                self.logger.debug(f"Updated to timestamp: {current_timestamp}")
                self._trigger_update()
                await asyncio.sleep(sleep_time)

                async with self._lock:
                    self.current_index = (self.current_index + 1) % len(self.data)
        except asyncio.CancelledError:
            self.logger.info("Simulation run cancelled.")
        finally:
            self.logger.info("Simulation stopped.")
