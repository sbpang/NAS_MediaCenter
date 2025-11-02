# Deployment Guide for Synology DS1621+

This guide provides detailed steps for deploying the NAS Media Player on your Synology DS1621+ NAS.

## Prerequisites

- Synology DS1621+ with DSM 7.0 or later
- SSH access enabled (Control Panel → Terminal & SNMP → Enable SSH)
- Admin access to your NAS
- Your Video_Server folder accessible on the NAS

## Quick Start Options

### Option A: Docker Deployment (Easiest & Recommended)

**Advantages:**
- Isolated environment
- Easy updates
- No conflicts with system Python

**Steps:**

1. **Prepare files on your local machine:**
   - Ensure all project files are ready

2. **Create Dockerfile** (if not already created):
   ```dockerfile
   FROM python:3.11-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   COPY . .
   ENV VIDEO_SERVER_PATH=/video
   EXPOSE 5000
   CMD ["python", "app.py"]
   ```

3. **On Synology DSM:**
   - Open **Package Center**
   - Install **Docker** (if not installed)
   - Open **Docker** application

4. **Build Docker Image:**
   - In Docker app, go to **Image** tab
   - Click **Add** → **Add from file**
   - Select your Dockerfile OR use Registry to pull Python image
   - Or use terminal:
     ```bash
     cd /path/to/NAS_Player
     docker build -t nas-player .
     ```

5. **Create Container:**
   - In Docker: **Container** → **Create**
   - Select your image
   - Set container name: `nas-player`
   - **Advanced Settings:**
     - **Volume**: Add mount
       - File/Folder: `/volume1/Video_Server`
       - Mount path: `/video`
     - **Port Settings:**
       - Container Port: `5000`
       - Local Port: `5000` (or any available port)
     - **Environment Variables:**
       - `VIDEO_SERVER_PATH=/video/static/artists`
     - **Auto Restart**: Enable

6. **Start Container:**
   - Launch the container
   - Access at: `http://your-nas-ip:5000`

### Option B: Native Python (Direct Installation)

**Advantages:**
- More control
- Direct access to system resources

**Steps:**

1. **Enable SSH:**
   - Control Panel → Terminal & SNMP
   - Enable SSH service
   - Note the port (default: 22)

2. **Connect via SSH:**
   ```bash
   ssh admin@your-nas-ip
   # Or: ssh admin@192.168.1.xxx
   ```

3. **Check Python Installation:**
   ```bash
   python3 --version
   # If not installed, install via Package Center or:
   # sudo synopkg install python3
   ```

4. **Create Project Directory:**
   ```bash
   sudo mkdir -p /volume1/docker/nas-player
   sudo chown admin:users /volume1/docker/nas-player
   cd /volume1/docker/nas-player
   ```

5. **Transfer Files from Local Machine:**
   
   **Option 1: Using SCP (from your local machine):**
   ```bash
   scp -r "C:\Users\bongb\OneDrive\Python\3.Cloud_SQL_Website\NAS_Player\*" admin@your-nas-ip:/volume1/docker/nas-player/
   ```
   
   **Option 2: Using File Station:**
   - Open File Station on DSM
   - Navigate to `/docker/nas-player`
   - Upload all files from your local project

6. **Install Dependencies:**
   ```bash
   cd /volume1/docker/nas-player
   pip3 install --user -r requirements.txt
   # Or use system-wide:
   sudo pip3 install -r requirements.txt
   ```

7. **Update Configuration:**
   ```bash
   nano app.py
   ```
   Change:
   ```python
   VIDEO_SERVER_PATH = '/volume1/Video_Server'
   ```

8. **Test Run:**
   ```bash
   python3 app.py
   ```
   - Should see: `Running on http://0.0.0.0:5000`
   - Access from browser: `http://your-nas-ip:5000`

9. **Create Startup Script (Optional):**
   ```bash
   nano /volume1/docker/nas-player/start.sh
   ```
   Add:
   ```bash
   #!/bin/bash
   cd /volume1/docker/nas-player
   /usr/local/bin/python3 app.py
   ```
   Make executable:
   ```bash
   chmod +x start.sh
   ```

### Option C: Using Task Scheduler (Auto-start on Boot)

1. **Open Task Scheduler** in Control Panel

2. **Create Triggered Task:**
   - General:
     - Task: `NAS Media Player`
     - User: `root`
     - Event: Boot-up
   - Task Settings:
     - Run command: `/volume1/docker/nas-player/start.sh`
     - OR: `/usr/local/bin/python3 /volume1/docker/nas-player/app.py`

3. **Enable the task**

## Production Setup with Reverse Proxy

### Using Synology's Built-in Reverse Proxy

1. **Open Control Panel → Application Portal → Reverse Proxy**

2. **Create Rule:**
   - Description: `NAS Media Player`
   - Protocol: `HTTP`
   - Hostname: `nas-player` (or your preferred subdomain)
   - Port: `5000` (or your chosen port)
   
   - Destination:
     - Protocol: `HTTP`
     - Hostname: `localhost`
     - Port: `5000`

3. **Access via:** `http://nas-player` (if DNS configured) or `http://your-nas-ip`

### Using Nginx (Advanced)

1. **Install Nginx via Package Center or Docker**

2. **Create Nginx Config:**
   ```nginx
   server {
       listen 80;
       server_name nas-player.local;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```

## Using Gunicorn for Production

For better performance and reliability:

1. **Install Gunicorn:**
   ```bash
   pip3 install gunicorn
   ```

2. **Update requirements.txt:**
   ```
   Flask==3.0.0
   flask-cors==4.0.0
   Werkzeug==3.0.1
   gunicorn==21.2.0
   ```

3. **Run with Gunicorn:**
   ```bash
   cd /volume1/docker/nas-player
   gunicorn -w 4 -b 0.0.0.0:5000 --timeout 120 app:app
   ```

4. **Update startup script:**
   ```bash
   #!/bin/bash
   cd /volume1/docker/nas-player
   /usr/local/bin/gunicorn -w 4 -b 0.0.0.0:5000 --timeout 120 app:app
   ```

## Verification Checklist

- [ ] SSH access works
- [ ] Python 3.x installed
- [ ] All files copied to NAS
- [ ] Dependencies installed
- [ ] VIDEO_SERVER_PATH configured correctly
- [ ] Service starts without errors
- [ ] Accessible via browser
- [ ] Artists load correctly
- [ ] Videos play successfully
- [ ] Auto-start configured (if desired)

## Common Issues & Solutions

### Issue: "Permission denied" errors
**Solution:**
```bash
sudo chown -R admin:users /volume1/docker/nas-player
chmod -R 755 /volume1/docker/nas-player
```

### Issue: Can't access media files
**Solution:**
- Check file permissions on Video_Server folder
- Verify mount path is correct
- Ensure Flask user has read access

### Issue: Port already in use
**Solution:**
- Change port in `app.py`: `app.run(port=5001)`
- Update firewall rules if needed

### Issue: Slow performance
**Solution:**
- Use Gunicorn instead of Flask dev server
- Enable SSD cache for Video_Server folder
- Consider using nginx for static file serving

## Firewall Configuration

1. **Control Panel → Security → Firewall**
2. **Create Rule:**
   - Port: `5000` (or your chosen port)
   - Protocol: `TCP`
   - Action: `Allow`
   - Source IP: Your network range (e.g., `192.168.1.0/24`)

## Maintenance

### Update Application:
```bash
cd /volume1/docker/nas-player
# Pull latest code or copy new files
pip3 install --upgrade -r requirements.txt
# Restart service
```

### View Logs:
```bash
# If using systemd:
journalctl -u nas-player -f

# If running directly:
# Check console output or redirect to log file
```

### Backup:
- Backup `/volume1/docker/nas-player` folder
- Backup configuration in `app.py`

## Security Recommendations

1. **Change default port** if exposing externally
2. **Use HTTPS** via reverse proxy with SSL certificate
3. **Restrict access** to local network only
4. **Add authentication** (consider Flask-Login)
5. **Regular updates** of Python packages

## Next Steps

- Customize UI colors and branding
- Add user authentication
- Implement playlist functionality
- Add transcoding support
- Integrate with Plex/Jellyfin if needed

---

**Need Help?** Check the main README.md for more details on configuration and troubleshooting.

