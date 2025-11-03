# LAN Media Center

A private media-center web application that scans your NAS folder structure and lets you browse & play videos in any browser or phone, inside your local network only.

## 🎯 Features

- **FastAPI Backend** - RESTful API with SQLite database
- **React Frontend** - Modern TypeScript UI with Vite
- **Media Scanning** - Automatically indexes videos with ffprobe metadata extraction
- **Video Streaming** - Range-request support for seeking and playback
- **Continue Watching** - Browser-local storage of playback progress
- **Dockerized** - Ready for Synology DS1621+ or Raspberry Pi 5

## 📁 Folder Structure

The application expects your media to be organized as:

```
/volume1/Video_Server/static/artists/<ArtistName>/<VideoCode>/
    ├── <media>        # one playable file (.mp4 .mkv .mov .wmv .avi .m4v)
    ├── poster.jpg     # cover
    └── fanart.jpg     # banner
```

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- NAS or server with media files
- ffmpeg (for ffprobe) - installed in backend container

### Installation

1. **Clone and navigate to project:**
   ```bash
   cd lan-media-center
   ```

2. **Update docker-compose.yml volumes:**
   
   Edit `docker-compose.yml` and update the volume mounts to match your system:
   ```yaml
   volumes:
     - /volume1/Video_Server:/media:ro  # Update to your media path
     - /volume1/docker/lan-media/data:/data  # Update to your data path
   ```

3. **Build and start:**
   ```bash
   make build
   make up
   ```

4. **Trigger initial scan:**
   ```bash
   make scan
   ```
   
   Or visit http://your-nas-ip:1700 and click "Scan Media Library"

5. **Access the app:**
   - Frontend: http://your-nas-ip:1700
   - API: http://your-nas-ip:1699
   - API Docs: http://your-nas-ip:1699/docs

## 📋 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/scan` | Scan media library |
| GET | `/api/artists` | List all artists |
| GET | `/api/artist/{id}` | Get artist details |
| GET | `/api/artist/{id}/items` | List items for artist |
| GET | `/api/item/{id}` | Get item details |
| GET | `/stream/original?item_id={id}` | Stream video file |
| GET | `/stream/poster/{item_id}` | Get poster image |
| GET | `/stream/fanart/{item_id}` | Get fanart image |
| GET | `/stream/cover/{artist_id}` | Get artist cover |

## 🔧 Configuration

Environment variables (set in `docker-compose.yml`):

- `API_PORT` - Backend API port (default: 1699)
- `MEDIA_ROOT` - Path to artists folder in container (default: `/media/static/artists`)
- `DB_PATH` - SQLite database path (default: `/data/media.db`)
- `ENABLE_PERIODIC_SCAN` - Enable automatic scanning (default: false)
- `SCAN_INTERVAL_MINUTES` - Scan interval if enabled (default: 120)

## 🛠️ Development

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 1699
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 🐳 Docker Commands

```bash
make build      # Build images
make up         # Start containers
make down       # Stop containers
make restart    # Restart containers
make logs       # View logs
make scan       # Trigger scan
make test       # Test API
make clean      # Remove everything
```

## 🗃️ Database Schema

- **artists** - Artist information with cover images
- **items** - Media items with metadata (codec, duration, resolution, etc.)
- **scan_logs** - Scan operation history

## 📱 Features

- **Grid View** - Browse artists and items in responsive grids
- **Video Player** - Native HTML5 video with controls and seeking
- **Continue Watching** - Automatically saves playback position
- **Metadata Display** - Shows duration, codec, resolution, and more
- **Image Support** - Posters, fanart, and artist covers

## 🔒 Security Notes

- Currently **no authentication** - designed for LAN-only use
- Only serves files indexed in the database and under `MEDIA_ROOT`
- Path validation prevents directory traversal
- CORS is permissive for development (restrict in production)

## 🧪 Testing

```bash
# Health check
curl http://localhost:1699/api/health

# Trigger scan
curl -X POST http://localhost:1699/api/scan

# List artists
curl http://localhost:1699/api/artists
```

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please ensure code follows the existing style and includes tests where appropriate.

## 🐛 Troubleshooting

**Scan returns no results:**
- Verify `MEDIA_ROOT` path is correct in docker-compose.yml
- Check volume mount permissions
- Ensure folder structure matches expected format

**Videos won't play:**
- Verify ffmpeg is installed in container
- Check file permissions on media files
- Ensure range requests are working (check browser network tab)

**Database issues:**
- Check `/data` volume is writable
- Remove database file to start fresh: `rm /volume1/docker/lan-media/data/media.db`

