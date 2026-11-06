from typing import List, Optional
from fastapi import APIRouter, Response, HTTPException, Query
from fastapi.responses import StreamingResponse
import io

from app.models.report import ReportHistoryItem, GenerateReportRequest
from app.services.report_service import (
    list_reports,
    generate_report,
    generate_csv_content,
    generate_pdf_content,
)

router = APIRouter(prefix="", tags=["Reports"])

@router.get("/reports", response_model=List[ReportHistoryItem])
def get_reports():
    return list_reports()

@router.post("/reports/generate", response_model=ReportHistoryItem)
def create_report(req: GenerateReportRequest):
    return generate_report(
        report_type=req.report_type,
        date_range=req.date_range or "Today",
        zones=req.zones,
        report_format=req.format,
    )

@router.get("/reports/{report_id}/download")
def download_report(report_id: str, format: Optional[str] = Query("PDF")):
    fmt = format.upper() if format else "PDF"
    if fmt == "CSV":
        csv_text = generate_csv_content(report_type="Site Summary", date_range="Today")
        return Response(
            content=csv_text,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=crowdsetu_report_{report_id}.csv"}
        )
    else:
        pdf_bytes = generate_pdf_content(report_type="Site Summary", date_range="Today")
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=crowdsetu_report_{report_id}.pdf"}
        )

@router.get("/flow/export")
def export_flow_csv(window: str = "5m"):
    csv_text = generate_csv_content(report_type="Flow Telemetry", date_range="Live")
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=crowdsetu_flow_{window}.csv"}
    )

