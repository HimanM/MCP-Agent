import logging

import httpx
from fastapi import APIRouter, Query
from fastapi.responses import Response

logger = logging.getLogger(__name__)
router = APIRouter(tags=["image"])

http_client = httpx.AsyncClient(timeout=15.0, follow_redirects=True)


@router.get("/api/image-proxy")
async def image_proxy(url: str = Query(...)):
    try:
        resp = await http_client.get(url)
        content_type = resp.headers.get("content-type", "image/jpeg")
        return Response(content=resp.content, media_type=content_type)
    except Exception as e:
        logger.exception("Image proxy failed for %s", url)
        return Response(content=b"", status_code=502)
