from __future__ import annotations
import sys
from loguru import logger
from .config import settings


def configure_logging() -> None:
    logger.remove()

    log_format = (
        "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
        "{message}"
    )

    level = "DEBUG" if settings.debug else "INFO"
    logger.add(sys.stdout, format=log_format, level=level, colorize=True)

    if settings.environment == "production":
        logger.add(
            "logs/app.log",
            rotation="100 MB",
            retention="30 days",
            compression="gz",
            level="INFO",
            serialize=True,
        )
