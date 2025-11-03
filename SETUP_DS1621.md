# Complete Setup Guide for DS1621+ NAS

This guide will walk you through setting up your NAS Media Center on your Synology DS1621+ with automatic deployment from GitHub.

## Prerequisites

- Synology DS1621+ with DSM 7.0 or later
- SSH access enabled
- Admin access to your NAS
- Your `Video_Server` folder path (e.g., `/volume1/Video_Server`)

---

## Step 1: Enable SSH on DS1621+

1. **Open Control Panel** on your NAS
2. Go to **Terminal & SNMP**
3. Enable **SSH service**
4. Note the port (default: 22)
5. **Save** settings

---

## Step 2: SSH into Your NAS

Open a terminal (PowerShell on Windows, Terminal on Mac/Linux) and connect:

```bash
ssh admin@YOUR_NAS_IP
# Example: ssh admin@192.168.1.100
```

Enter your admin password when prompted.

---

## Step 3: Install Required Packages

### Option A: Install Docker (Recommended for Easy Management)

1. **Via DSM Web Interface:**
   - Open **Package Center**
   - Search for **Docker**
   - Install **Docker** package
   - Wait for installation to complete

2. **Verify Docker Installation:**
   ```bash
   docker --version
   docker-compose --version
   ```

### Option B: Install Git (REQUIRED for Deployment)

**Git is required to clone the repository.** You have several options:

#### Method 1: Via Package Center (Easiest - Recommended)

1. **Open DSM Web Interface**
2. Go to **Package Center**
3. Search for **"Git Server"**
4. Click **Install**
5. Wait for installation to complete

#### Method 2: Via Command Line

Try these commands in order (SSH into your NAS first):

```bash
# Try Synology package manager
sudo synopkg install git

# If that doesn't work, try installing Git Server package
sudo synopkg install GitServer

# Verify installation
git --version
```

#### Method 3: Via Entware (If Available)

If you have Entware installed:

```bash
opkg update
opkg install git-http
git --version
```

#### Method 4: Manual Installation (Advanced)

If none of the above work, you may need to:
1. Download Git for your Synology architecture
2. Or compile from source (complex, not recommended)

**After installing Git, verify it works:**
```bash
git --version
```

You should see something like: `git version 2.x.x`

---

## Step 4: Create Deployment Directory

On your NAS via SSH:

```bash
# Create the directory
sudo mkdir -p /volume1/docker/nas-player

# Set proper permissions
sudo chown -R admin:users /volume1/docker/nas-player

# Navigate to it
cd /volume1/docker/nas-player
```

---

## Step 5: Clone Repository

**Make sure Git is installed first!** (See Step 3, Option B)

On your NAS via SSH:

```bash
cd /volume1/docker/nas-player

# Clone your repository
git clone https://github.com/sbpang/NAS_MediaCenter.git .

# If you get "fatal: destination path '.' already exists and is not an empty directory"
# Either remove the directory first, or clone to a different location:
# git clone https://github.com/sbpang/NAS_MediaCenter.git /volume1/docker/nas-player-temp
# Then move files: mv /volume1/docker/nas-player-temp/* /volume1/docker/nas-player/

# Verify files are there
ls -la
```

You should see files like `app.py`, `requirements.txt`, `Dockerfile`, etc.

**Note:** If the repository is private, you'll need to authenticate. See the troubleshooting section below.

---

## Step 6: Verify Video Server Path and Configuration

Make sure your `Video_Server` folder exists and has the correct structure:

```bash
# Check if Video_Server exists
ls -la /volume1/Video_Server

# Verify structure (should have static/artists/)
ls -la /volume1/Video_Server/static/artists/
```

**Important Configuration Notes:**

1. **Docker automatically handles the path** - The `docker-compose.yml` mounts `/volume1/Video_Server` to `/video` inside the container and sets `VIDEO_SERVER_PATH=/video` as an environment variable. **No manual changes needed** for NAS deployment.

2. **Check `app.py` for Windows paths** - Before deploying, verify that line 29 in `app.py` is **commented out** (should have `#`):
   ```python
   # VIDEO_SERVER_PATH = r'V:'  # This should be commented for NAS deployment
   ```
   If you see `VIDEO_SERVER_PATH = r'V:'` without the `#`, comment it out or the container will use the wrong path.

3. **If your Video_Server is in a different location**, update the volume mount in `docker-compose.yml` (line 12):
   ```yaml
   - /your/custom/path/Video_Server:/video:ro
   ```

---

## Step 7: Deploy Docker Container

#### 7A. Make Deploy Script Executable

```bash
chmod +x /volume1/docker/nas-player/deploy.sh
```

#### 7B. Start Docker Service

**Important:** Before starting, verify that `app.py` line 29 has the Windows path commented out:
```bash
# Check the file
grep -n "VIDEO_SERVER_PATH" app.py | head -2
# Should show:
# 27:VIDEO_SERVER_PATH = os.getenv('VIDEO_SERVER_PATH', '/volume1/Video_Server')
# 29:# VIDEO_SERVER_PATH = r'V:'
```

If line 29 is not commented (shows `VIDEO_SERVER_PATH = r'V:'`), comment it out:
```bash
sed -i "s/^VIDEO_SERVER_PATH = r'V:'/# VIDEO_SERVER_PATH = r'V:'/" app.py
```

Then start the service:
```bash
cd /volume1/docker/nas-player

# Start the media player container
docker-compose up -d --build
```

This will:
- Build the Docker container
- Start the media player on port 1699
- Mount `/volume1/Video_Server` to `/video` inside the container
- Set `VIDEO_SERVER_PATH=/video` environment variable automatically

#### 7C. Verify Service Is Running

```bash
# Check containers
docker ps

# You should see:
# - nas-player

# Check logs
docker logs nas-player
```

---

## Step 8: Set Up Automatic Deployment

Since your NAS is not exposed to the internet, GitHub webhooks won't work. See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive deployment methods including:

- **Method A: Cron Job** (Recommended) - Periodic auto-updates
- **Method B: Synology Task Scheduler** - GUI-based scheduling
- **Method C: Manual Deployment** - On-demand updates
- **Method D: SSH Script from Local Machine** - Semi-automatic
- **Method E: GitHub Actions** - Fully automatic (advanced)

**Quick Start (Recommended):**
```bash
# Set up cron job for hourly updates
cd /volume1/docker/nas-player
crontab -e
# Add: 0 * * * * cd /volume1/docker/nas-player && /volume1/docker/nas-player/deploy.sh >> /volume1/docker/nas-player/deploy.log 2>&1
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions and troubleshooting.

---

## Step 9: Configure Firewall (Important!)

### Via DSM Web Interface:

1. **Control Panel → Security → Firewall**
2. **Create Rule:**
   - **Name:** NAS Media Player
   - **Port:** 1699
   - **Protocol:** TCP
   - **Action:** Allow
   - **Source IP:** Your local network (e.g., `192.168.1.0/24`)

**Security Note:** Port 1699 only needs to be accessible on your local network.

---

## Step 10: Test the Setup

### 10A. Test Media Player

1. Open your browser
2. Go to: `http://YOUR_NAS_IP:1699`
3. You should see the NAS Media Player interface
4. Check if artists and videos load correctly

### 10B. Test Auto-Deployment

**If using Cron Job or Task Scheduler:**

1. Make a small change to any file (locally)
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Test deployment"
   git push origin main
   ```

3. Wait for the scheduled check (or trigger manually):
   ```bash
   # On NAS, manually trigger deployment
   cd /volume1/docker/nas-player
   bash deploy.sh
   ```

4. Check deployment logs:
   ```bash
   tail -20 /volume1/docker/nas-player/deploy.log
   ```

5. Verify container restarted:
   ```bash
   docker logs nas-player | tail -10
   ```

---

## Troubleshooting

For comprehensive troubleshooting, see [DEPLOYMENT.md](DEPLOYMENT.md).

### Common Issues

**Media Player Not Accessible:**
```bash
# Check if container is running
docker ps
docker logs nas-player
docker restart nas-player
```

**Git Not Found:**
- Install via Package Center: Search for "Git Server" and install
- Or via command line: `sudo synopkg install git`
- See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed Git installation steps

**Port Already in Use:**
- Find what's using port 1699: `netstat -tuln | grep 1699`
- Stop conflicting containers: `docker ps -a | grep 1699`
- See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed port conflict resolution

**Permission Issues:**
```bash
sudo chown -R admin:users /volume1/docker/nas-player
chmod -R 755 /volume1/docker/nas-player
```

---

## Maintenance

See [DEPLOYMENT.md](DEPLOYMENT.md) for maintenance commands and best practices.

### Quick Commands

```bash
# View logs
docker logs -f nas-player

# Restart service
cd /volume1/docker/nas-player
docker-compose restart nas-player

# Manual update
git pull origin main
docker-compose restart nas-player
```

---

## Next Steps

Once everything is working:

1. ✅ Set up reverse proxy for HTTPS (optional but recommended)
2. ✅ Add authentication (if needed)
3. ✅ Configure backup for your deployment directory
4. ✅ Set up monitoring/notifications

---

## Quick Reference Commands

```bash
# Start service
cd /volume1/docker/nas-player
docker-compose up -d

# Stop service
docker-compose down

# View logs
docker logs nas-player

# Restart service
docker-compose restart nas-player

# Manual deployment
cd /volume1/docker/nas-player
bash deploy.sh
```

---

**Need Help?** 
- See [README.md](README.md) for overview
- See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment and troubleshooting
- See [METADATA.md](METADATA.md) for title scraping features

