"""Pydantic schemas for API requests/responses."""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ArtistBase(BaseModel):
    name: str
    cover_path: Optional[str] = None


class ArtistCreate(ArtistBase):
    pass


class ArtistResponse(ArtistBase):
    id: int
    item_count: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ItemBase(BaseModel):
    video_code: str
    title: Optional[str] = None
    abs_path: str
    poster_path: Optional[str] = None
    fanart_path: Optional[str] = None
    duration_sec: Optional[float] = None
    vcodec: Optional[str] = None
    acodec: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    mtime: Optional[datetime] = None


class ItemCreate(ItemBase):
    artist_id: int


class ItemResponse(ItemBase):
    id: int
    artist_id: int
    artist_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ScanResponse(BaseModel):
    status: str
    scan_id: int
    added: int
    updated: int
    errors: Optional[list] = None


class HealthResponse(BaseModel):
    status: str

