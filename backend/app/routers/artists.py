"""Artist endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.db import get_db
from app.models import Artist, Item
from app.schemas import ArtistResponse

router = APIRouter(prefix="/api", tags=["artists"])


@router.get("/artists", response_model=List[ArtistResponse])
async def list_artists(db: Session = Depends(get_db)):
    """List all artists with item count."""
    artists = db.query(Artist).all()
    
    result = []
    for artist in artists:
        item_count = db.query(func.count(Item.id)).filter(Item.artist_id == artist.id).scalar()
        
        artist_dict = {
            "id": artist.id,
            "name": artist.name,
            "cover_path": artist.cover_path,
            "item_count": item_count,
            "created_at": artist.created_at,
        }
        result.append(artist_dict)
    
    return result


@router.get("/artist/{artist_id}", response_model=ArtistResponse)
async def get_artist(artist_id: int, db: Session = Depends(get_db)):
    """Get artist by ID."""
    artist = db.query(Artist).filter(Artist.id == artist_id).first()
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")
    
    item_count = db.query(func.count(Item.id)).filter(Item.artist_id == artist.id).scalar()
    
    return {
        "id": artist.id,
        "name": artist.name,
        "cover_path": artist.cover_path,
        "item_count": item_count,
        "created_at": artist.created_at,
    }

