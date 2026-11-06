from app.routers.auth import router as auth_router
from app.routers.zones import router as zones_router
from app.routers.alerts import router as alerts_router
from app.routers.devices import router as devices_router
from app.routers.pilgrims import router as pilgrims_router
from app.routers.cameras import router as cameras_router
from app.routers.reports import router as reports_router
from app.routers.cv import router as cv_router
from app.routers.health import router as health_router

__all__ = [
    "auth_router",
    "zones_router",
    "alerts_router",
    "devices_router",
    "pilgrims_router",
    "cameras_router",
    "reports_router",
    "cv_router",
    "health_router",
]

