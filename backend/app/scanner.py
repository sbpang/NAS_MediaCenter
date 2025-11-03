"""Media scanner that crawls the NAS folder structure."""
import subprocess
import json
from pathlib import Path
from typing import Optional, Dict, List
from datetime import datetime
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Artist, Item, ScanLog
from app.db import SessionLocal


def find_media_file(folder: Path) -> Optional[Path]:
    """Find the first playable media file in a folder."""
    for ext in settings.VIDEO_EXTENSIONS:
        for file in folder.glob(f"*{ext}"):
            if file.is_file():
                return file
    return None


def find_image(folder: Path, filename: str) -> Optional[str]:
    """Find image file and return relative path string."""
    img_path = folder / filename
    if img_path.exists() and img_path.is_file():
        return str(img_path)
    return None


def get_media_metadata(file_path: Path) -> Dict:
    """Extract metadata using ffprobe."""
    try:
        cmd = [
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            str(file_path)
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode != 0:
            return {}
        
        data = json.loads(result.stdout)
        
        metadata = {
            "duration_sec": None,
            "vcodec": None,
            "acodec": None,
            "width": None,
            "height": None,
        }
        
        # Get duration from format
        if "format" in data and "duration" in data["format"]:
            try:
                metadata["duration_sec"] = float(data["format"]["duration"])
            except (ValueError, TypeError):
                pass
        
        # Get video/audio codecs and dimensions from streams
        for stream in data.get("streams", []):
            codec_type = stream.get("codec_type", "")
            
            if codec_type == "video":
                if not metadata["vcodec"]:
                    metadata["vcodec"] = stream.get("codec_name")
                if not metadata["width"]:
                    metadata["width"] = stream.get("width")
                if not metadata["height"]:
                    metadata["height"] = stream.get("height")
            
            elif codec_type == "audio":
                if not metadata["acodec"]:
                    metadata["acodec"] = stream.get("codec_name")
        
        return metadata
    
    except (subprocess.TimeoutExpired, json.JSONDecodeError, FileNotFoundError) as e:
        return {}


def scan_media_root(db: Session) -> ScanLog:
    """Scan MEDIA_ROOT and update database."""
    scan_log = ScanLog(started_at=datetime.now())
    db.add(scan_log)
    db.commit()
    db.refresh(scan_log)
    
    added_count = 0
    updated_count = 0
    errors: List[str] = []
    
    media_root = settings.MEDIA_ROOT
    
    if not media_root.exists():
        scan_log.finished_at = datetime.now()
        scan_log.errors_json = json.dumps([f"MEDIA_ROOT does not exist: {media_root}"])
        db.commit()
        return scan_log
    
    try:
        # Walk through ArtistName folders
        for artist_folder in media_root.iterdir():
            if not artist_folder.is_dir():
                continue
            
            artist_name = artist_folder.name
            
            # Get or create artist
            artist = db.query(Artist).filter(Artist.name == artist_name).first()
            if not artist:
                artist = Artist(name=artist_name)
                db.add(artist)
                db.commit()
                db.refresh(artist)
            
            # Check for cover in artist folder
            cover_path = find_image(artist_folder, "poster.jpg")
            if cover_path and artist.cover_path != cover_path:
                artist.cover_path = cover_path
                db.commit()
            
            # Walk through VideoCode folders
            for video_folder in artist_folder.iterdir():
                if not video_folder.is_dir():
                    continue
                
                video_code = video_folder.name
                
                # Find media file
                media_file = find_media_file(video_folder)
                if not media_file:
                    continue
                
                abs_path = str(media_file)
                poster_path = find_image(video_folder, "poster.jpg")
                fanart_path = find_image(video_folder, "fanart.jpg")
                
                # Get file mtime
                try:
                    mtime = datetime.fromtimestamp(media_file.stat().st_mtime)
                except OSError:
                    mtime = None
                
                # Get metadata
                metadata = get_media_metadata(media_file)
                
                # Check if item exists
                existing_item = db.query(Item).filter(Item.abs_path == abs_path).first()
                
                if existing_item:
                    # Update existing
                    existing_item.artist_id = artist.id
                    existing_item.video_code = video_code
                    existing_item.title = video_code  # Use video_code as default title
                    existing_item.poster_path = poster_path
                    existing_item.fanart_path = fanart_path
                    existing_item.duration_sec = metadata.get("duration_sec")
                    existing_item.vcodec = metadata.get("vcodec")
                    existing_item.acodec = metadata.get("acodec")
                    existing_item.width = metadata.get("width")
                    existing_item.height = metadata.get("height")
                    existing_item.mtime = mtime
                    updated_count += 1
                else:
                    # Create new
                    new_item = Item(
                        artist_id=artist.id,
                        video_code=video_code,
                        title=video_code,
                        abs_path=abs_path,
                        poster_path=poster_path,
                        fanart_path=fanart_path,
                        duration_sec=metadata.get("duration_sec"),
                        vcodec=metadata.get("vcodec"),
                        acodec=metadata.get("acodec"),
                        width=metadata.get("width"),
                        height=metadata.get("height"),
                        mtime=mtime,
                    )
                    db.add(new_item)
                    added_count += 1
                
                db.commit()
    
    except Exception as e:
        errors.append(str(e))
        scan_log.errors_json = json.dumps(errors)
    
    scan_log.finished_at = datetime.now()
    scan_log.added_count = added_count
    scan_log.updated_count = updated_count
    if errors:
        scan_log.errors_json = json.dumps(errors)
    
    db.commit()
    return scan_log


def run_scan() -> ScanLog:
    """Run a scan using a new database session."""
    db = SessionLocal()
    try:
        return scan_media_root(db)
    finally:
        db.close()

