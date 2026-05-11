from fastapi import APIRouter

from .admin import router as admin_router
from .ai import router as ai_router
from .api_keys import router as api_keys_router
from .auth import router as auth_router
from .billing import router as billing_router
from .books import router as books_router
from .health import router as health_router
from .profiles import router as profiles_router
from .spaces import router as spaces_router
from .users import router as users_router
from .webhooks import router as webhooks_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(spaces_router)
api_router.include_router(admin_router)
api_router.include_router(ai_router)
api_router.include_router(billing_router)
api_router.include_router(webhooks_router)
api_router.include_router(api_keys_router)
api_router.include_router(health_router)
api_router.include_router(books_router)
api_router.include_router(profiles_router)
