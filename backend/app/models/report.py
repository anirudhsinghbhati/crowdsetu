from typing import List, Literal, Optional
from pydantic import BaseModel

class GenerateReportRequest(BaseModel):
    report_type: str = "Daily summary"
    date_range: Optional[str] = "Today"
    zones: List[str] = ["All 4 zones"]
    format: Literal["PDF", "CSV"] = "PDF"

class ReportHistoryItem(BaseModel):
    id: str
    name: str
    date_range: str
    zones: str
    generated: str
    format: Literal["PDF", "CSV"]
    status: str
