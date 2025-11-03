"""Database models."""
from sqlalchemy import Column, Integer, String, ForeignKey, Float, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime

from app.db import Base


class Artist(Base):
    """Artist model."""
    __tablename__ = "artists"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    cover_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=func.now())
    
    items = relationship("Item", back_populates="artist", cascade="all, delete-orphan")


class Item(Base):
    """Media item model."""
    __tablename__ = "items"
    
    id = Column(Integer, primary_key=True, index=True)
    artist_id = Column(Integer, ForeignKey("artists.id"), nullable=False)
    video_code = Column(String, nullable=False)
    title = Column(String, nullable=True)
    abs_path = Column(String, nullable=False, unique=True, index=True)
    poster_path = Column(String, nullable=True)
    fanart_path = Column(String, nullable=True)
    duration_sec = Column(Float, nullable=True)
    vcodec = Column(String, nullable=True)
    acodec = Column(String, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    mtime = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    artist = relationship("Artist", back_populates="items")


class ScanLog(Base):
    """Scan operation log."""
    __tablename__ = "scan_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    started_at = Column(DateTime, default=func.now(), nullable=False)
    finished_at = Column(DateTime, nullable=True)
    added_count = Column(Integer, default=0)
    updated_count = Column(Integer, default=0)
    errors_json = Column(Text, nullable=True)  # JSON string of errors

