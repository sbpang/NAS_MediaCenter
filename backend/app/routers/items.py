"""Item endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db import get_db
from app.models import Item, Artist
from app.schemas import ItemResponse

router = APIRouter(prefix="/api", tags=["items"])


@router.get("/artist/{artist_id}/items", response_model=List[ItemResponse])
async def list_artist_items(artist_id: int, db: Session = Depends(get_db)):
    """List all items for an artist."""
    artist = db.query(Artist).filter(Artist.id == artist_id).first()
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")
    
    items = db.query(Item).filter(Item.artist_id == artist_id).order_by(Item.mtime.desc()).all()
    
    result = []
    for item in items:
        item_dict = {
            "id": item.id,
            "artist_id": item.artist_id,
            "artist_name": artist.name,
            "video_code": item.video_code,
            "title": item.title,
            "abs_path": item.abs_path,
            "poster_path": item.poster_path,
            "fanart_path": item.fanart_path,
            "duration_sec": item.duration_sec,
            "vcodec": item.vcodec,
            "acodec": item.acodec,
            "width": item.width,
            "height": item.height,
            "mtime": item.mtime,
            "created_at": item.created_at,
            "updated_at": item.updated_at,
        }
        result.append(item_dict)
    
    return result


@router.get("/item/{item_id}", response_model=ItemResponse)
async def get_item(item_id: int, db: Session = Depends(get_db)):
    """Get item by ID."""
    item = db.query(Item).join(Artist).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return {
        "id": item.id,
        "artist_id": item.artist_id,
        "artist_name": item.artist.name,
        "video_code": item.video_code,
        "title": item.title,
        "abs_path": item.abs_path,
        "poster_path": item.poster_path,
        "fanart_path": item.fanart_path,
        "duration_sec": item.duration_sec,
        "vcodec": item.vcodec,
        "acodec": item.acodec,
        "width": item.width,
        "height": item.height,
        "mtime": item.mtime,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }

