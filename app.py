from flask import Flask, jsonify, send_file, send_from_directory, request
from flask_cors import CORS
import os
import json
from pathlib import Path
from title_updater import TitleUpdater

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

def load_title_mapping(artist_name):
    """Load title mapping from title.json file"""
    title_file = Path(VIDEO_SERVER_PATH) / 'static' / 'artists' / artist_name / 'title.json'
    
    if not title_file.exists():
        return {}
    
    try:
        with open(title_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            # title.json structure: {"ArtistName": {"CODE": "Title", ...}}
            if artist_name in data:
                return data[artist_name]
            # Fallback: if structure is flat {"CODE": "Title"}
            return data
    except (json.JSONDecodeError, KeyError, IOError) as e:
        print(f"Error loading title.json for {artist_name}: {e}")
        return {}

@app.route('/api/artists/<artist_name>/videos')
def get_artist_videos(artist_name):
    """Get all videos for a specific artist"""
    artist_path = Path(VIDEO_SERVER_PATH) / 'static' / 'artists' / artist_name
    
    if not artist_path.exists():
        return jsonify({'error': 'Artist not found'}), 404
    
    # Load title mappings from title.json
    title_mapping = load_title_mapping(artist_name)
    
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
                # Get title from mapping, fallback to code if not found
                video_title = title_mapping.get(item.name, item.name)
                
                videos.append({
                    'code': item.name,
                    'title': video_title,
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

@app.route('/api/titles/check', methods=['GET'])
def check_missing_titles():
    """Check for videos missing titles in title.json"""
    try:
        updater = TitleUpdater(VIDEO_SERVER_PATH)
        summary = updater.get_all_missing_summary()
        
        total_missing = sum(info['missing_count'] for info in summary.values())
        
        return jsonify({
            'status': 'success',
            'artists_checked': len(summary),
            'total_missing': total_missing,
            'details': summary
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/titles/update', methods=['POST'])
def update_missing_titles():
    """
    Auto-update title.json for missing videos
    Body: {
        "artist_name": "optional - update specific artist",
        "placeholder": "optional - placeholder title for missing entries",
        "scrape_real_titles": true/false - if true, scrapes real titles (JavSP-style)
    }
    """
    try:
        data = request.get_json() or {}
        artist_name = data.get('artist_name')
        placeholder = data.get('placeholder', '[Title Missing]')
        scrape_real = data.get('scrape_real_titles', False)
        
        updater = TitleUpdater(VIDEO_SERVER_PATH)
        
        if artist_name:
            # Update specific artist
            missing = updater.find_missing_titles(artist_name)
            if missing:
                if scrape_real:
                    # Scrape real titles (JavSP-style)
                    successful = updater.scrape_and_update_titles(artist_name, missing)
                    # Fill remaining with placeholder
                    remaining = [code for code in missing if code not in successful]
                    if remaining and placeholder:
                        placeholder_updates = {code: placeholder for code in remaining}
                        updater.update_title_json(artist_name, placeholder_updates)
                    
                    return jsonify({
                        'status': 'success',
                        'artist': artist_name,
                        'scraped': len(successful),
                        'placeholder_added': len(remaining) if placeholder else 0,
                        'total_updated': len(successful) + (len(remaining) if placeholder else 0),
                        'scraped_codes': list(successful.keys()),
                        'placeholder_codes': remaining if placeholder else []
                    })
                else:
                    # Use placeholder
                    updates = {code: placeholder for code in missing}
                    updater.update_title_json(artist_name, updates)
                    return jsonify({
                        'status': 'success',
                        'artist': artist_name,
                        'updated': len(updates),
                        'codes': missing
                    })
            else:
                return jsonify({
                    'status': 'success',
                    'artist': artist_name,
                    'updated': 0,
                    'message': 'No missing titles'
                })
        else:
            # Update all artists
            results = updater.auto_update_all_artists(
                placeholder_title=placeholder,
                scrape_real_titles=scrape_real
            )
            total_updated = sum(len(codes) for codes in results.values())
            
            return jsonify({
                'status': 'success',
                'artists_updated': len(results),
                'total_updated': total_updated,
                'scrape_mode': 'real titles' if scrape_real else 'placeholder',
                'details': results
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/titles/<artist_name>/scrape', methods=['POST'])
def scrape_titles_for_artist(artist_name):
    """
    Scrape real titles for missing videos (JavSP-style)
    Body: {
        "codes": ["CODE1", "CODE2"] - optional, scrapes all missing if not provided
    }
    """
    try:
        data = request.get_json() or {}
        codes = data.get('codes')
        
        updater = TitleUpdater(VIDEO_SERVER_PATH)
        successful = updater.scrape_and_update_titles(artist_name, codes)
        
        return jsonify({
            'status': 'success',
            'artist': artist_name,
            'scraped': len(successful),
            'titles': successful
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/titles/<artist_name>/missing', methods=['GET'])
def get_missing_titles_for_artist(artist_name):
    """Get list of missing titles for a specific artist"""
    try:
        updater = TitleUpdater(VIDEO_SERVER_PATH)
        missing = updater.find_missing_titles(artist_name)
        
        return jsonify({
            'artist': artist_name,
            'missing_count': len(missing),
            'missing_codes': missing
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=1699, debug=True)

