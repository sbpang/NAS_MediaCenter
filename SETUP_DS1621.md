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

## Step 6: Verify Video Server Path

Make sure your `Video_Server` folder exists and has the correct structure:

```bash
# Check if Video_Server exists
ls -la /volume1/Video_Server

# Verify structure (should have static/artists/)
ls -la /volume1/Video_Server/static/artists/
```

**Note:** Adjust the path if your video folder is in a different location. Update the path in:
- `docker-compose.webhook.yml` (line 14)
- `app.py` (if needed)

---

## Step 7: Choose Deployment Method

You have two options:

### Method A: Docker with Webhook (Recommended - Automatic Updates)

This will automatically update when you push to GitHub.

#### 7A. Update Webhook Secret

```bash
cd /volume1/docker/nas-player

# Create a strong secret (save this for later - you'll need it for GitHub)
# You can generate one with:
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Or manually create one, e.g.: "my-super-secret-webhook-key-2024"
```

#### 7B. Create Environment File

```bash
cd /volume1/docker/nas-player

# Create .env file for Docker Compose
cat > .env << EOF
WEBHOOK_SECRET=your-super-secret-webhook-key-2024
DEPLOY_SCRIPT=/app/deploy.sh
EOF

# Replace 'your-super-secret-webhook-key-2024' with your actual secret
nano .env  # Edit the file and save your secret
```

#### 7C. Make Deploy Script Executable

```bash
chmod +x /volume1/docker/nas-player/deploy.sh
```

#### 7D. Start Docker Services

```bash
cd /volume1/docker/nas-player

# Start both the media player and webhook receiver
docker-compose -f docker-compose.webhook.yml up -d --build
```

This will:
- Build both Docker containers
- Start the media player on port 1699
- Start the webhook receiver on port 1700

#### 7E. Verify Services Are Running

```bash
# Check containers
docker ps

# You should see:
# - nas-player
# - nas-player-webhook

# Check logs
docker logs nas-player
docker logs nas-player-webhook
```

#### 7F. Find Your NAS IP Address

```bash
# Get your NAS IP (you'll need this for GitHub webhook)
hostname -I
# Or check in DSM: Control Panel → Network → Network Interface
```

---

## Step 8: Configure GitHub Webhook (For Automatic Deployment)

### 8A. Access GitHub Webhook Settings

1. Go to: `https://github.com/sbpang/NAS_MediaCenter`
2. Click **Settings** tab
3. Click **Webhooks** in the left sidebar
4. Click **Add webhook**

### 8B. Configure Webhook

Fill in the form:

- **Payload URL:** 
  ```
  http://YOUR_NAS_IP:1700/webhook
  ```
  Replace `YOUR_NAS_IP` with your NAS IP address (e.g., `http://192.168.1.100:1700/webhook`)

- **Content type:** `application/json`

- **Secret:** 
  Enter the same secret you set in Step 7A (the one in your `.env` file)

- **Which events would you like to trigger this webhook?**
  Select: **Just the push event**

- **Active:** ✓ Check this box

- Click **Add webhook**

### 8C. Test the Webhook

GitHub will send a test ping. You can check if it worked:

1. In GitHub, click on the webhook you just created
2. Scroll down to **Recent Deliveries**
3. You should see a ping event - click on it
4. Check if it returned a 200 status

**Note:** If you get an error, check:
- Firewall on your NAS allows port 1700
- Webhook service is running: `docker logs nas-player-webhook`
- Your router allows incoming connections (or use a VPN/tailscale)

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

3. **Create Another Rule:**
   - **Name:** Webhook Receiver
   - **Port:** 1700
   - **Protocol:** TCP
   - **Action:** Allow
   - **Source IP:** 
     - For local network only: `192.168.1.0/24`
     - For GitHub webhooks, you may need to allow all or use a service like ngrok

**Security Note:** For production, consider:
- Using a VPN (like Tailscale) instead of exposing port 1700 publicly
- Using Synology's built-in reverse proxy with SSL
- Restricting access to specific IP ranges

---

## Step 10: Test the Setup

### 10A. Test Media Player

1. Open your browser
2. Go to: `http://YOUR_NAS_IP:1699`
3. You should see the NAS Media Player interface
4. Check if artists and videos load correctly

### 10B. Test Auto-Deployment

1. Make a small change to any file (locally)
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Test deployment"
   git push origin main
   ```

3. Check webhook delivery in GitHub (Settings → Webhooks → Recent Deliveries)
4. Check deployment logs on NAS:
   ```bash
   docker logs nas-player-webhook
   ```
5. Your NAS should automatically pull and restart the service!

---

## Troubleshooting

### Media Player Not Accessible

```bash
# Check if container is running
docker ps

# Check logs
docker logs nas-player

# Restart container
docker restart nas-player
```

### Webhook Not Working

```bash
# Check webhook container logs
docker logs nas-player-webhook

# Verify webhook is listening
curl http://localhost:1700/health

# Check if port is open
netstat -tuln | grep 1700
```

### Git Not Found / Git Command Not Found

If you see `git: command not found`:

```bash
# Check if Git is installed
which git

# If not found, install via Package Center (GUI method):
# 1. Open DSM → Package Center
# 2. Search for "Git Server"
# 3. Install it

# Or try command line:
sudo synopkg install git
# OR
sudo synopkg install GitServer

# Verify installation
git --version

# If Git Server package is installed but git command not found:
# Check if it's in a different location:
/usr/local/bin/git --version
# If that works, you may need to add to PATH or create symlink:
sudo ln -s /usr/local/bin/git /usr/bin/git
```

### Git Pull Fails in Deploy Script

```bash
# Check git configuration
cd /volume1/docker/nas-player
git remote -v

# Make sure deploy script is executable
chmod +x deploy.sh

# Test deploy script manually
bash /volume1/docker/nas-player/deploy.sh
```

### Cannot Clone Private Repository

If your repository is private and clone fails with authentication error:

**Option 1: Use Personal Access Token**
```bash
# Clone with token (replace YOUR_TOKEN with your GitHub token)
git clone https://YOUR_TOKEN@github.com/sbpang/NAS_MediaCenter.git .

# Or when prompted:
# Username: sbpang
# Password: [paste your GitHub Personal Access Token]
```

**Option 2: Set up SSH keys (for automated deployments)**
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "nas-deployment" -f ~/.ssh/id_ed25519

# Display public key
cat ~/.ssh/id_ed25519.pub

# Add this key to GitHub: https://github.com/settings/keys
# Then clone using SSH:
git clone git@github.com:sbpang/NAS_MediaCenter.git .
```

### Port Already in Use (Critical Error)

If you see: `Error starting userland proxy: listen tcp4 0.0.0.0:1699: bind: address already in use`

**This means port 1699 is already being used by another service.**

#### Solution 1: Find and Stop the Service Using Port 1699

```bash
# Find what's using port 1699
netstat -tuln | grep 1699
# OR
lsof -i :1699
# OR
ss -tulpn | grep 1699

# Check if there's already a Docker container using it
docker ps -a | grep 1699

# If it's a Docker container, stop it:
docker stop <container_name>
docker rm <container_name>

# If it's a Python process (maybe you ran app.py directly):
ps aux | grep "app.py"
# Kill it:
pkill -f "python.*app.py"
# OR if you know the PID:
kill <PID>
```

#### Solution 2: Use a Different Port (Quick Fix)

Change the port mapping in `docker-compose.webhook.yml`:

```bash
cd /volume1/docker/nas-player
nano docker-compose.webhook.yml
```

Change line 11 from:
```yaml
      - "1699:1699"
```
To (for example, using port 1701):
```yaml
      - "1701:1699"
```

This means:
- External port: 1701 (access via `http://NAS_IP:1701`)
- Internal container port: 1699 (app still runs on 1699 inside container)

**After changing, save and restart:**
```bash
docker-compose -f docker-compose.webhook.yml down
docker-compose -f docker-compose.webhook.yml up -d --build
```

**Don't forget to update your firewall rules and GitHub webhook URL if needed!**

### Permission Issues

```bash
# Fix permissions
sudo chown -R admin:users /volume1/docker/nas-player
chmod -R 755 /volume1/docker/nas-player
```

---

## Alternative: Manual Deployment (Without Docker)

If you prefer not to use Docker:

1. Install Python 3 on your NAS
2. Clone repository as shown in Step 5
3. Install dependencies:
   ```bash
   cd /volume1/docker/nas-player
   pip3 install --user -r requirements.txt
   ```
4. Update `app.py` to use NAS path:
   ```python
   VIDEO_SERVER_PATH = '/volume1/Video_Server'
   ```
5. Run manually:
   ```bash
   python3 app.py
   ```
6. Set up Task Scheduler in DSM for auto-start on boot

---

## Maintenance

### View Logs
```bash
# Media player logs
docker logs -f nas-player

# Webhook logs
docker logs -f nas-player-webhook
```

### Restart Services
```bash
cd /volume1/docker/nas-player
docker-compose -f docker-compose.webhook.yml restart
```

### Update Manually
```bash
cd /volume1/docker/nas-player
git pull origin main
docker-compose -f docker-compose.webhook.yml up -d --build
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
# Start services
cd /volume1/docker/nas-player
docker-compose -f docker-compose.webhook.yml up -d

# Stop services
docker-compose -f docker-compose.webhook.yml down

# View logs
docker logs nas-player
docker logs nas-player-webhook

# Restart services
docker-compose -f docker-compose.webhook.yml restart

# Manual deployment
cd /volume1/docker/nas-player
bash deploy.sh
```

---

**Need Help?** Check the main `README.md` or `DEPLOYMENT_GUIDE.md` for more details.

