import io
import csv
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from app.database import get_db
from app.models.report import ReportHistoryItem
from app.services.zone_service import get_all_zones
from app.services.alert_service import get_alerts

def list_reports() -> List[ReportHistoryItem]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM reports ORDER BY id DESC;")
        rows = cursor.fetchall()
        return [
            ReportHistoryItem(
                id=r["id"],
                name=r["name"],
                date_range=r["date_range"],
                zones=r["zones"],
                generated=r["generated"],
                format=r["format"],
                status=r["status"],
            )
            for r in rows
        ]

def generate_report(
    report_type: str = "Daily summary",
    date_range: str = "Today",
    zones: List[str] = None,
    report_format: str = "PDF"
) -> ReportHistoryItem:
    if zones is None:
        zones = ["All 4 zones"]

    zones_str = ", ".join(zones) if isinstance(zones, list) else str(zones)
    report_id = str(int(datetime.now().timestamp()))
    name = f"{report_type} · Sector A"
    now_display = datetime.now().strftime("%d %b · %H:%M")
    fmt = report_format.upper()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO reports (id, name, date_range, zones, generated, format, status)
            VALUES (?, ?, ?, ?, ?, ?, 'Available');
            """,
            (report_id, name, date_range, zones_str, now_display, fmt)
        )

    return ReportHistoryItem(
        id=report_id,
        name=name,
        date_range=date_range,
        zones=zones_str,
        generated="Just now",
        format=fmt,
        status="Available"
    )

def generate_csv_content(report_type: str, date_range: str) -> str:
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["CrowdSetu Site Telemetry Report"])
    writer.writerow(["Report Type", report_type])
    writer.writerow(["Date Range", date_range])
    writer.writerow(["Generated At", datetime.now().isoformat()])
    writer.writerow([])

    zones = get_all_zones()

    if "Alert" in report_type:
        alerts = get_alerts("all")
        writer.writerow(["Alert ID", "Zone ID", "Zone Name", "Level", "Message", "Status", "Timestamp"])
        for a in alerts:
            writer.writerow([a.id, a.zone_id, a.zone_name, a.level.upper(), a.msg, a.status.upper(), a.ts])
    else:
        writer.writerow(["Zone ID", "Zone Name", "Capacity", "Current Occupancy", "Occupancy %", "Level", "Net Flow (5m)"])
        for z in zones:
            pct = round((z.count / z.capacity) * 100, 1) if z.capacity > 0 else 0
            writer.writerow([z.id, z.name, z.capacity, z.count, f"{pct}%", z.level.upper(), z.net_flow])

    return output.getvalue()

def generate_pdf_content(report_type: str, date_range: str) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#14181F"),
    )
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#7A8190"),
    )

    story = []
    story.append(Paragraph("CrowdSetu — Site Telemetry & Safety Audit Report", title_style))
    story.append(Spacer(1, 4))
    story.append(
        Paragraph(
            f"<b>Report Type:</b> {report_type} | <b>Date:</b> {date_range} | <b>Generated:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S IST')}",
            subtitle_style
        )
    )
    story.append(Spacer(1, 16))

    zones = get_all_zones()

    # Summary table
    table_data = [
        ["Zone Name", "Capacity", "Current Count", "Occupancy %", "Level", "Net Flow (5m)"]
    ]
    for z in zones:
        pct = round((z.count / z.capacity) * 100, 1) if z.capacity > 0 else 0
        table_data.append([
            z.name,
            str(z.capacity),
            str(z.count),
            f"{pct}%",
            z.level.upper(),
            f"{z.net_flow:+d}" if z.net_flow else "0"
        ])

    table = Table(table_data, colWidths=[140, 70, 80, 80, 80, 90])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1D232D")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#E8E6DF")),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#2B3340")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8F9FA")]),
    ]))
    story.append(table)

    story.append(Spacer(1, 20))
    story.append(Paragraph("<b>Recent Incident & Surge Alerts</b>", styles["Heading3"]))
    story.append(Spacer(1, 8))

    alerts = get_alerts("all")[:5]
    alert_table_data = [["ID", "Zone", "Level", "Status", "Timestamp", "Message"]]
    for a in alerts:
        alert_table_data.append([
            str(a.id),
            a.zone_name or f"Zone {a.zone_id}",
            a.level.upper(),
            a.status.upper(),
            a.ts[:19].replace("T", " "),
            a.msg[:45] + "..." if len(a.msg) > 45 else a.msg
        ])

    alert_table = Table(alert_table_data, colWidths=[35, 100, 60, 60, 110, 175])
    alert_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#2B3340")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#FFFFFF")),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E0E0E0")),
    ]))
    story.append(alert_table)

    doc.build(story)
    return buffer.getvalue()
