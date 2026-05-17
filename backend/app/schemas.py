from datetime import datetime

from pydantic import BaseModel


class SetTimeRequest(BaseModel):
    timestamp: datetime

