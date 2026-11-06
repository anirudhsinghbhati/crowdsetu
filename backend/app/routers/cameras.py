from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.services.stream_service import generate_mjpeg_stream

router = APIRouter(prefix="/cameras", tags=["Cameras"])

@router.get("/{camera_id}/stream")
async def camera_stream(camera_id: int):
    return StreamingResponse(
        generate_mjpeg_stream(camera_id),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )
