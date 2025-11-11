# NAS Media Player

A modern web-based media player for Synology NAS, designed to stream videos and audio from your organized media library.

## Features

- 🎨 Modern, responsive UI with dark theme
- 🎬 Video and audio streaming support
- 🔍 Search functionality
- 📱 Mobile-friendly design
- 🚀 Fast media scanning and playback
- 🖼️ Automatic poster/fanart display

## Project Structure

```
NAS_MediaCenter/
├── app.py                 # Flask backend server
├── jav_scraper.py         # JavSP-style title scraper
├── title_updater.py        # Auto title detection and update
├── deploy.sh              # Deployment script
├── requirements.txt       # Python dependencies
├── docker-compose.yml      # Docker setup
├── Dockerfile             # Media player container
├── static/
│   ├── index.html        # Main frontend page
│   ├── styles.css        # Styling
│   └── app.js           # Frontend JavaScript
└── README.md             # This file
```

## Quick Links

- **[Setup Guide](SETUP_DS1621.md)** - Complete step-by-step setup instructions
- **[Deployment Guide](DEPLOYMENT.md)** - Deployment methods and troubleshooting
- **[Metadata Management](METADATA.md)** - Title scraping and auto-update system

## Local Setup (Development)

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Update the video path in `app.py`:**
   ```python
   VIDEO_SERVER_PATH = r'C:\path\to\Video_Server'  # For local testing
   ```

3. **Run the application:**
   ```bash
   python app.py
   ```

4. **Access the player:**
   Open your browser to `http://localhost:1699`

## Deployment on Synology DS1621+

See [SETUP_DS1621.md](SETUP_DS1621.md) for detailed setup instructions and [DEPLOYMENT.md](DEPLOYMENT.md) for deployment methods and troubleshooting.

### Quick Start with Docker

```bash
# 1. Clone repository
cd /volume1/docker
git clone https://github.com/sbpang/NAS_MediaCenter.git nas-player
cd nas-player

# 2. Start Docker service
docker-compose up -d --build

# 3. Access at http://YOUR_NAS_IP:1699
```

**Note:** Make sure to update `VIDEO_SERVER_PATH` in `docker-compose.yml` to match your video folder location.

## Configuration

### Environment Variables

- `VIDEO_SERVER_PATH`: Path to your Video_Server directory
  - Windows: `C:\path\to\Video_Server`
  - NAS: `/volume1/Video_Server`

### Folder Structure Expected

```
Video_Server/
└── static/
    └── artists/
        ├── ArtistName1/
        │   ├── icon.jpg
        │   └── VideoCode1/
        │       ├── fanart.jpg
        │       ├── poster.jpg
        │       └── media.mp4
        └── ArtistName2/
            └── ...
```

## Troubleshooting

For deployment issues, see [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive troubleshooting.

### Common Issues

**Media files not loading:**
- Check file permissions on NAS
- Verify `VIDEO_SERVER_PATH` is correct (environment variable or in `app.py`)
- Ensure media files are readable

**Port conflicts:**
- Change port in `app.py`: `app.run(port=1700)`
- Update `docker-compose.yml` port mapping
- Check firewall settings (DSM → Control Panel → Security → Firewall)

## Security Considerations

- For production, add authentication
- Use HTTPS via reverse proxy
- Restrict access to internal network only
- Consider adding user authentication layer

## Performance Tips

- Use SSD cache for frequently accessed files
- Enable transcoding for better compatibility
- Consider caching metadata in database for large libraries

## License

Free to use and modify for personal use.

---
*Last deployment: 2024*


