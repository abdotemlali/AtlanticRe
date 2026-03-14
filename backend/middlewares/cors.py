from fastapi.middleware.cors import CORSMiddleware
from core.config import ENVIRONMENT, FRONTEND_URL

def setup_cors(app):
    if ENVIRONMENT == "production":
        allowed_origins = [FRONTEND_URL]
    else:
        allowed_origins = [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
        ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["*"],
    )
