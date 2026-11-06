from typing import List, Literal, Optional
from fastapi import APIRouter, HTTPException
from app.models.alert import Alert
from app.services.alert_service import get_alerts, acknowledge_alert, get_alert_by_id

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("", response_model=List[Alert])
def list_alerts(status: Literal["open", "ack", "all"] = "all"):
    return get_alerts(status)

@router.get("/{alert_id}", response_model=Alert)
def get_alert(alert_id: int):
    alert = get_alert_by_id(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert

@router.post("/{alert_id}/ack", response_model=Alert)
def ack_alert(alert_id: int):
    alert = acknowledge_alert(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert
