"""
Rate Limiting Middleware
Protects endpoints from abuse
"""
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask import Flask


def init_rate_limiter(app: Flask):
    """Initialize rate limiter"""
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=["200 per day", "50 per hour"],
        storage_uri="memory://"  # Use Redis in production: "redis://localhost:6379"
    )
    return limiter


