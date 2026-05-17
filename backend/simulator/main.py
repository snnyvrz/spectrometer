import logging
from pathlib import Path
from typing import List

import pandas as pd

CSV_FILE_PATH = Path('..') / 'spectra.csv' # if you run this file from the backend directory, it works. Adjust the path if you run it from a different location.

class Simulation:
    def __init__(self):
        self.logger = self._setup_logger()
        self.data: pd.DataFrame = self._load_csv()
        self.current_index: int = 0
        self.current_timestamp: pd.Timestamp = self.data.iloc[self.current_index]['timestamp']
        self.current_spectrum: List[float] = self.data.iloc[self.current_index]['spectrum']
        self.running: bool = False

    def _load_csv(self) -> pd.DataFrame:
        try:
            raw_data = pd.read_csv(CSV_FILE_PATH)
        except FileNotFoundError:
            self.logger.error(f"CSV file not found. Please ensure '{CSV_FILE_PATH}' is in the correct directory.")
            raise SystemExit(1)

        timestamp_column = raw_data.columns[0]
        spectrum_columns = raw_data.columns[1:]

        return pd.DataFrame({
            'timestamp': pd.to_datetime(raw_data[timestamp_column]),
            'spectrum': raw_data[spectrum_columns].values.tolist(),
        })
    
    def _setup_logger(self) -> logging.Logger:
        logger = logging.getLogger('SimulationLogger')
        logger.setLevel(logging.DEBUG)
        ch = logging.StreamHandler()
        ch.setLevel(logging.DEBUG)
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        ch.setFormatter(formatter)
        logger.addHandler(ch)
        return logger