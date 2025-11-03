"""Media streaming utilities."""
import os
from pathlib import Path
from typing import Optional
from fastapi import HTTPException
from fastapi.responses import StreamingResponse

from app.config import settings
from app.models import Item
from app.db import SessionLocal


def is_safe_path(file_path: str) -> bool:
    """Check if file path is within MEDIA_ROOT and exists."""
    try:
        abs_path = Path(file_path).resolve()
        media_root = settings.MEDIA_ROOT.resolve()
        
        # Ensure path is within MEDIA_ROOT
        if not str(abs_path).startswith(str(media_root)):
            return False
        
        # Check file exists
        if not abs_path.exists() or not abs_path.is_file():
            return False
        
        return True
    except (OSError, ValueError):
        return False


def get_item_by_id(item_id: int) -> Optional[Item]:
    """Get item by ID and verify it exists in database."""
    db = SessionLocal()
    try:
        item = db.query(Item).filter(Item.id == item_id).first()
        return item
    finally:
        db.close()


def stream_file(file_path: str, range_header: Optional[str] = None) -> StreamingResponse:
    """Stream file with range request support."""
    if not is_safe_path(file_path):
        raise HTTPException(status_code=404, detail="File not found or access denied")
    
    file = Path(file_path)
    file_size = file.stat().st_size
    
    # Parse range header
    start = 0
    end = file_size - 1
    
    if range_header:
        try:
            # Parse "bytes=start-end"
            range_match = range_header.replace("bytes=", "").split("-")
            if range_match[0]:
                start = int(range_match[0])
            if len(range_match) > 1 and range_match[1]:
                end = int(range_match[1])
            
            # Ensure valid range
            if start >= file_size:
                raise HTTPException(status_code=416, detail="Range not satisfiable")
            if end >= file_size:
                end = file_size - 1
        except (ValueError, IndexError):
            pass
    
    chunk_size = 8192
    
    def generate():
        with open(file_path, "rb") as f:
            f.seek(start)
            remaining = end - start + 1
            
            while remaining > 0:
                read_size = min(chunk_size, remaining)
                chunk = f.read(read_size)
                if not chunk:
                    break
                remaining -= len(chunk)
                yield chunk
    
    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(end - start + 1),
        "Content-Type": "video/mp4",  # Default, should detect from file
    }
    
    status_code = 206 if range_header else 200
    
    return StreamingResponse(
        generate(),
        status_code=status_code,
        headers=headers,
        media_type="video/mp4",
    )

