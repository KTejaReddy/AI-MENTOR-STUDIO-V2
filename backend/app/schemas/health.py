from pydantic import BaseModel


class ComponentStatus(BaseModel):
    status: str
    detail: str | None = None


class HealthResponse(BaseModel):
    status: str
    version: str
    app_name: str
    database: ComponentStatus
    google_oauth: ComponentStatus
    jwt: ComponentStatus
    cors: ComponentStatus
    rate_limiter: ComponentStatus
    ai_backend: ComponentStatus
