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

### Option B: Install Git (For Manual Deployment)

If not already installed:
```bash
# Via Package Center, install "Git Server"
# Or via SSH:
sudo synopkg install git
```

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

On your NAS via SSH:

```bash
cd /volume1/docker/nas-player

# Clone your repository
git clone https://github.com/sbpang/NAS_MediaCenter.git .

# Verify files are there
ls -la
```

You should see files like `app.py`, `requirements.txt`, `Dockerfile`, etc.

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
- Start the media player on port 5000
- Start the webhook receiver on port 5001

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
  http://YOUR_NAS_IP:5001/webhook
  ```
  Replace `YOUR_NAS_IP` with your NAS IP address (e.g., `http://192.168.1.100:5001/webhook`)

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
- Firewall on your NAS allows port 5001
- Webhook service is running: `docker logs nas-player-webhook`
- Your router allows incoming connections (or use a VPN/tailscale)

---

## Step 9: Configure Firewall (Important!)

### Via DSM Web Interface:

1. **Control Panel → Security → Firewall**
2. **Create Rule:**
   - **Name:** NAS Media Player
   - **Port:** 5000
   - **Protocol:** TCP
   - **Action:** Allow
   - **Source IP:** Your local network (e.g., `192.168.1.0/24`)

3. **Create Another Rule:**
   - **Name:** Webhook Receiver
   - **Port:** 5001
   - **Protocol:** TCP
   - **Action:** Allow
   - **Source IP:** 
     - For local network only: `192.168.1.0/24`
     - For GitHub webhooks, you may need to allow all or use a service like ngrok

**Security Note:** For production, consider:
- Using a VPN (like Tailscale) instead of exposing port 5001 publicly
- Using Synology's built-in reverse proxy with SSL
- Restricting access to specific IP ranges

---

## Step 10: Test the Setup

### 10A. Test Media Player

1. Open your browser
2. Go to: `http://YOUR_NAS_IP:5000`
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
curl http://localhost:5001/health

# Check if port is open
netstat -tuln | grep 5001
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

### Port Already in Use

If port 5000 or 5001 is already in use:

```bash
# Find what's using the port
netstat -tuln | grep 5000

# Or change ports in docker-compose.webhook.yml
nano docker-compose.webhook.yml
# Change "5000:5000" to "5002:5000" etc.
```

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

