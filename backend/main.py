from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from mcp.client import mcp_client
from routes.cart import router as cart_router
from routes.chat import router as chat_router
from routes.image_proxy import router as image_router
from routes.mcp_debug import router as mcp_debug_router
from routes.meta import router as meta_router
from routes.ws import router as ws_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info('Connecting to Kapruka MCP server at %s', settings.mcp_server_url)
    try:
        await mcp_client.initialize()
        tools = await mcp_client.list_tools()
        logger.info('MCP connected. Available tools: %s', [tool.get('name') for tool in tools])
    except Exception as exc:
        logger.error('Failed to connect to MCP server: %s', exc)
    yield
    await mcp_client.close()
    logger.info('Shutdown complete')


app = FastAPI(title='Kapruka Shopping Agent', version='1.1.0', lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(chat_router)
app.include_router(cart_router)
app.include_router(ws_router)
app.include_router(image_router)
app.include_router(meta_router)
app.include_router(mcp_debug_router)


@app.get('/health')
async def health():
    return {'status': 'ok'}


if __name__ == '__main__':
    import uvicorn

    uvicorn.run('main:app', host='0.0.0.0', port=8000, reload=True)
