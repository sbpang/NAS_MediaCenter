# NAS Media Player

A modern web-based media player for your Synology DS1621+ NAS, designed to stream videos and audio from your organized media library.

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
├── webhook_server.py      # GitHub webhook receiver for auto-deployment
├── deploy.sh              # Deployment script
├── requirements.txt       # Python dependencies
├── docker-compose.webhook.yml  # Docker setup with webhook
├── Dockerfile             # Media player container
├── Dockerfile.webhook     # Webhook receiver container
├── static/
│   ├── index.html        # Main frontend page
│   ├── styles.css        # Styling
│   └── app.js           # Frontend JavaScript
└── README.md             # This file
```

## Quick Links

- **[Setup Guide](SETUP_DS1621.md)** - Complete step-by-step setup instructions
- **[Why Webhook & Two Ports?](WHY_WEBHOOK_AND_PORTS.md)** - Explains auto-deployment architecture
- **[Fresh Start Setup](FRESH_START_SETUP.md)** - Clean installation guide

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

### Method 1: Using Docker (Recommended)

1. **Create a Dockerfile:**
   ```dockerfile
   FROM python:3.11-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   COPY . .
   EXPOSE 1699
   CMD ["python", "app.py"]
   ```

2. **Build and run in Docker:**
   - Use Synology's Docker Package Manager
   - Create a new container from the Dockerfile
   - Mount your Video_Server folder as a volume
   - Set environment variable: `VIDEO_SERVER_PATH=/volume1/Video_Server`

### Method 2: Native Python Setup

1. **SSH into your DS1621+:**
   ```bash
   ssh admin@your-nas-ip
   ```

2. **Install Python 3 (if not already installed):**
   - Via Synology Package Manager: Install Python 3.x
   - Or via SSH: Follow Synology's Python installation guide

3. **Copy files to NAS:**
   ```bash
   # Create directory on NAS
   mkdir -p /volume1/docker/nas-player
   
   # Copy all files from your local machine to NAS
   # Use SCP, SFTP, or File Station
   ```

4. **Install dependencies:**
   ```bash
   cd /volume1/docker/nas-player
   pip3 install -r requirements.txt
   ```

5. **Update `app.py` with NAS path:**
   ```python
   VIDEO_SERVER_PATH = '/volume1/Video_Server'
   ```

6. **Create a systemd service (optional, for auto-start):**
   ```bash
   sudo nano /etc/systemd/system/nas-player.service
   ```
   
   Add:
   ```ini
   [Unit]
   Description=NAS Media Player
   After=network.target
   
   [Service]
   Type=simple
   User=your-user
   WorkingDirectory=/volume1/docker/nas-player
   ExecStart=/usr/local/bin/python3 /volume1/docker/nas-player/app.py
   Restart=always
   
   [Install]
   WantedBy=multi-user.target
   ```

7. **Enable and start service:**
   ```bash
   sudo systemctl enable nas-player
   sudo systemctl start nas-player
   ```

### Method 3: Using Synology Web Station

1. **Install Web Station from Package Center**

2. **Copy project to:**
   ```
   /volume1/web/nas-player/
   ```

3. **Configure Web Station:**
   - Set PHP version to latest
   - Create virtual host pointing to `/volume1/web/nas-player`
   - Note: You'll need to run Flask via WSGI or use gunicorn

4. **For production, use Gunicorn:**
   ```bash
   pip install gunicorn
   gunicorn -w 4 -b 0.0.0.0:1699 app:app
   ```

### Reverse Proxy Setup (Recommended for Production)

1. **Install Nginx (or use built-in reverse proxy in Control Panel)**

2. **Configure reverse proxy:**
   - Open Control Panel → Application Portal → Reverse Proxy
   - Add rule:
     - Source: Protocol: HTTP, Hostname: `nas-player.local`, Port: 80
     - Destination: Protocol: HTTP, Hostname: `localhost`, Port: 1699

3. **Access via:** `http://nas-player.local`

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

### Media files not loading
- Check file permissions on NAS
- Verify `VIDEO_SERVER_PATH` is correct
- Ensure media files are readable

### CORS errors
- Already handled by `flask-cors`
- If issues persist, check firewall settings

### Port conflicts
- Change port in `app.py`: `app.run(port=1700)`
- Update reverse proxy configuration

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

