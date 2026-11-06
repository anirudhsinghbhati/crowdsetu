from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import CORS_ORIGINS, DEBUG
from app.database import init_db
from app.services.live_engine import start_simulation, stop_simulation
from app.routers import (
    auth_router,
    zones_router,
    alerts_router,
    devices_router,
    pilgrims_router,
    cameras_router,
    reports_router,
    cv_router,
    health_router,
)
from app.websocket.live import router as websocket_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    start_simulation()
    yield
    # Shutdown
    stop_simulation()

app = FastAPI(
    title="CrowdSetu Backend API",
    description="Real-time crowd monitoring and management system for pilgrimage sites in India",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
    debug=DEBUG,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Standard error handler for consistent frontend toast/message format
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import logging
    logging.exception("Unhandled server exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"message": "Internal server error", "detail": str(exc)},
    )

# Include all API routes under /api
api_prefix = "/api"
app.include_router(auth_router, prefix=api_prefix)
app.include_router(zones_router, prefix=api_prefix)
app.include_router(alerts_router, prefix=api_prefix)
app.include_router(devices_router, prefix=api_prefix)
app.include_router(pilgrims_router, prefix=api_prefix)
app.include_router(cameras_router, prefix=api_prefix)
app.include_router(reports_router, prefix=api_prefix)
app.include_router(cv_router, prefix=api_prefix)
app.include_router(health_router, prefix=api_prefix)

# Root-level health & WebSockets
app.include_router(health_router, prefix="")
app.include_router(websocket_router, prefix="")

@app.get("/")
def root():
    return {
        "system": "CrowdSetu",
        "description": "Real-time crowd monitoring and management system",
        "docs": "/docs",
        "health": "/health",
        "api_base": "/api",
        "websocket": "/ws/live",
    }

if __name__ == "__main__":
    import uvicorn
    from app.config import HOST, PORT
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)

