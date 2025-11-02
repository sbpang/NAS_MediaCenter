from flask import Flask, jsonify, send_file, send_from_directory
from flask_cors import CORS
import os
import json
from pathlib import Path

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)  # Enable CORS for all routes

# Additional CORS headers for better compatibility
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Configuration - Update this path to your actual Video_Server location
# Priority: Environment variable > Hard-coded path
# Windows examples:
#   - Network share: r'\\DS1621+\Video_Server' or r'V:\'
#   - Local: r'C:\path\to\Video_Server'
# Linux/NAS examples:
#   - /volume1/Video_Server
VIDEO_SERVER_PATH = os.getenv('VIDEO_SERVER_PATH', '/volume1/Video_Server')  # Default for DS1621+ deployment

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/api/artists')
def get_artists():
    """Get list of all artists"""
    artists_path = Path(VIDEO_SERVER_PATH) / 'static' / 'artists'
    
    if not artists_path.exists():
        return jsonify({'error': 'Artists directory not found'}), 404
    
    artists = []
    for artist_folder in artists_path.iterdir():
        if artist_folder.is_dir():
            icon_path = artist_folder / 'icon.jpg'
            artist_data = {
                'name': artist_folder.name,
                'icon': f'/api/artists/{artist_folder.name}/icon' if icon_path.exists() else None,
                'path': str(artist_folder)
            }
            artists.append(artist_data)
    
    return jsonify(artists)

@app.route('/api/artists/<artist_name>/icon')
def get_artist_icon(artist_name):
    """Get artist icon image"""
    icon_path = Path(VIDEO_SERVER_PATH) / 'static' / 'artists' / artist_name / 'icon.jpg'
    
    if icon_path.exists():
        return send_file(str(icon_path), mimetype='image/jpeg')
    return jsonify({'error': 'Icon not found'}), 404

@app.route('/api/artists/<artist_name>/videos')
def get_artist_videos(artist_name):
    """Get all videos for a specific artist"""
    artist_path = Path(VIDEO_SERVER_PATH) / 'static' / 'artists' / artist_name
    
    if not artist_path.exists():
        return jsonify({'error': 'Artist not found'}), 404
    
    videos = []
    
    # Scan for video code folders
    for item in artist_path.iterdir():
        if item.is_dir() and item.name != '__pycache__':
            # Look for media files and metadata
            media_files = []
            fanart = None
            poster = None
            
            for file in item.iterdir():
                if file.is_file():
                    ext = file.suffix.lower()
                    if ext in ['.mp4', '.mkv', '.avi', '.mov', '.wav', '.mp3', '.flac', '.m4a', '.webm']:
                        media_files.append({
                            'filename': file.name,
                            'path': f'/api/stream/{artist_name}/{item.name}/{file.name}',
                            'type': 'video' if ext in ['.mp4', '.mkv', '.avi', '.mov', '.webm'] else 'audio'
                        })
                    elif file.name.lower() == 'fanart.jpg':
                        fanart = f'/api/video/{artist_name}/{item.name}/fanart'
                    elif file.name.lower() == 'poster.jpg':
                        poster = f'/api/video/{artist_name}/{item.name}/poster'
            
            if media_files:
                videos.append({
                    'code': item.name,
                    'media': media_files,
                    'fanart': fanart,
                    'poster': poster
                })
    
    return jsonify(videos)

@app.route('/api/video/<artist_name>/<video_code>/fanart')
def get_fanart(artist_name, video_code):
    """Get fanart image"""
    fanart_path = Path(VIDEO_SERVER_PATH) / 'static' / 'artists' / artist_name / video_code / 'fanart.jpg'
    
    if fanart_path.exists():
        return send_file(str(fanart_path), mimetype='image/jpeg')
    return jsonify({'error': 'Fanart not found'}), 404

@app.route('/api/video/<artist_name>/<video_code>/poster')
def get_poster(artist_name, video_code):
    """Get poster image"""
    poster_path = Path(VIDEO_SERVER_PATH) / 'static' / 'artists' / artist_name / video_code / 'poster.jpg'
    
    if poster_path.exists():
        return send_file(str(poster_path), mimetype='image/jpeg')
    return jsonify({'error': 'Poster not found'}), 404

@app.route('/api/stream/<artist_name>/<video_code>/<filename>')
def stream_media(artist_name, video_code, filename):
    """Stream media files with range request support for video seeking"""
    media_path = Path(VIDEO_SERVER_PATH) / 'static' / 'artists' / artist_name / video_code / filename
    
    if not media_path.exists():
        return jsonify({'error': 'Media file not found'}), 404
    
    # Determine MIME type based on file extension
    ext = media_path.suffix.lower()
    mime_types = {
        '.mp4': 'video/mp4',
        '.mkv': 'video/x-matroska',
        '.avi': 'video/x-msvideo',
        '.mov': 'video/quicktime',
        '.webm': 'video/webm',
        '.wav': 'audio/wav',
        '.mp3': 'audio/mpeg',
        '.flac': 'audio/flac',
        '.m4a': 'audio/mp4'
    }
    mime_type = mime_types.get(ext, 'application/octet-stream')
    
    # Use Flask's send_file with range request support for video seeking
    return send_file(
        str(media_path),
        mimetype=mime_type,
        conditional=True,
        as_attachment=False
    )

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=1699, debug=True)

