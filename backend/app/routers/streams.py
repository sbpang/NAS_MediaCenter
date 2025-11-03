"""Media streaming endpoints."""
from fastapi import APIRouter, Query, Request, HTTPException
from fastapi.responses import StreamingResponse, FileResponse

from app.media import get_item_by_id, stream_file

router = APIRouter(prefix="/stream", tags=["streams"])


@router.get("/original")
async def stream_original(item_id: int = Query(...), request: Request):
    """Stream original media file with range request support."""
    item = get_item_by_id(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    range_header = request.headers.get("range")
    
    return stream_file(item.abs_path, range_header)


@router.get("/poster/{item_id}")
async def get_poster(item_id: int):
    """Serve poster image."""
    item = get_item_by_id(item_id)
    if not item or not item.poster_path:
        raise HTTPException(status_code=404, detail="Poster not found")
    
    from app.media import is_safe_path
    if not is_safe_path(item.poster_path):
        raise HTTPException(status_code=404, detail="Poster not accessible")
    
    return FileResponse(item.poster_path, media_type="image/jpeg")


@router.get("/fanart/{item_id}")
async def get_fanart(item_id: int):
    """Serve fanart image."""
    item = get_item_by_id(item_id)
    if not item or not item.fanart_path:
        raise HTTPException(status_code=404, detail="Fanart not found")
    
    from app.media import is_safe_path
    if not is_safe_path(item.fanart_path):
        raise HTTPException(status_code=404, detail="Fanart not accessible")
    
    return FileResponse(item.fanart_path, media_type="image/jpeg")


@router.get("/cover/{artist_id}")
async def get_artist_cover(artist_id: int):
    """Serve artist cover image."""
    from app.db import SessionLocal
    from app.models import Artist
    
    db = SessionLocal()
    try:
        artist = db.query(Artist).filter(Artist.id == artist_id).first()
        if not artist or not artist.cover_path:
            raise HTTPException(status_code=404, detail="Cover not found")
        
        from app.media import is_safe_path
        if not is_safe_path(artist.cover_path):
            raise HTTPException(status_code=404, detail="Cover not accessible")
        
        return FileResponse(artist.cover_path, media_type="image/jpeg")
    finally:
        db.close()

