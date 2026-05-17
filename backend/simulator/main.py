import asyncio
from datetime import datetime
import logging
from pathlib import Path

import pandas as pd

# if you run this file from the backend directory, it works.
# Adjust the path if you run it from a different location.
CSV_FILE_PATH = Path("..") / "spectra.csv"


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

    def start(self):
        self.running = True
        self._running_event.set()

    def stop(self):
        self.running = False
        self._running_event.clear()

    async def run(self):
        try:
            while True:
                if not self.running:
                    await self._running_event.wait()
                    continue

                row = self.data.iloc[self.current_index]
                self.current_timestamp = row["timestamp"]
                self.current_spectrum = row["spectrum"]
                self.logger.debug(f"Updated to timestamp: {self.current_timestamp}")
                await asyncio.sleep(self._get_sleep_time())
                self.current_index = (self.current_index + 1) % len(self.data)
        except asyncio.CancelledError:
            self.logger.info("Simulation run cancelled.")

    def _get_sleep_time(self) -> float:
        """Calculate the time to sleep until the next timestamp."""

        next_index = (self.current_index + 1) % len(self.data)

        if next_index == 0:
            return 1.0

        next_timestamp = self.data.iloc[next_index]["timestamp"]
        return (next_timestamp - self.current_timestamp).total_seconds()

    def get_latest_spectrum(self) -> list[float]:
        return self.current_spectrum

    def get_latest_timestamp(self) -> datetime:
        return self.current_timestamp

    def set_timestamp(self, timestamp: datetime):
        self.current_timestamp = timestamp
        self.current_index = self.data.index[self.data["timestamp"] == timestamp][0]
        self.current_spectrum = self.data.iloc[self.current_index]["spectrum"]
        self.logger.debug(f"Timestamp set to: {self.current_timestamp}")
