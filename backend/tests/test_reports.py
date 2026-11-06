import pytest

def test_list_and_generate_reports(client):
    # List initial reports
    res = client.get("/api/reports")
    assert res.status_code == 200
    reports = res.json()
    assert len(reports) >= 4

    # Generate new report
    gen_payload = {
        "report_type": "Daily summary",
        "date_range": "Today",
        "zones": ["Main Gate", "Sanctum Corridor"],
        "format": "PDF"
    }
    res_gen = client.post("/api/reports/generate", json=gen_payload)
    assert res_gen.status_code == 200
    report_data = res_gen.json()
    assert report_data["format"] == "PDF"
    assert "Daily summary" in report_data["name"]

    # Download PDF
    rep_id = report_data["id"]
    res_pdf = client.get(f"/api/reports/{rep_id}/download?format=pdf")
    assert res_pdf.status_code == 200
    assert res_pdf.headers["content-type"] == "application/pdf"
    assert len(res_pdf.content) > 100

    # Download CSV
    res_csv = client.get(f"/api/reports/{rep_id}/download?format=csv")
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    assert "CrowdSetu Site Telemetry Report" in res_csv.text

def test_export_flow_csv(client):
    res = client.get("/api/flow/export?window=5m")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "Zone ID" in res.text
