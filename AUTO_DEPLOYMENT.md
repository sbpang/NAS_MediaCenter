# Automated Deployment from GitHub to DS1621+

This guide shows how to set up automatic deployment so that when you commit code to GitHub, it automatically updates on your DS1621+.

## Method 1: Git Pull with Cron Job (Simplest)

### Setup Steps:

1. **SSH into your DS1621+:**
   ```bash
   ssh admin@your-nas-ip
   ```

2. **Install Git (if not already installed):**
   - Via Package Center: Install "Git Server" package
   - Or via SSH: `sudo synopkg install git`

3. **Create deployment directory:**
   ```bash
   sudo mkdir -p /volume1/docker/nas-player
   sudo chown admin:users /volume1/docker/nas-player
   cd /volume1/docker/nas-player
   ```

4. **Clone your repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git .
   ```

5. **Update `deploy.sh` with your GitHub repository URL:**
   ```bash
   nano deploy.sh
   ```
   Change:
   ```bash
   GIT_REPO_URL="https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
   ```

6. **Make deploy script executable:**
   ```bash
   chmod +x deploy.sh
   ```

7. **Set up cron job to check for updates:**
   ```bash
   crontab -e
   ```
   Add this line to check every 5 minutes:
   ```cron
   */5 * * * * /volume1/docker/nas-player/deploy.sh >> /volume1/docker/nas-player/deploy.log 2>&1
   ```
   Or check once per hour:
   ```cron
   0 * * * * /volume1/docker/nas-player/deploy.sh >> /volume1/docker/nas-player/deploy.log 2>&1
   ```

### Manual Deployment:
```bash
/volume1/docker/nas-player/deploy.sh
```

---

## Method 2: GitHub Webhook (Real-time, Recommended)

This method triggers deployment immediately when you push to GitHub.

### Setup Steps:

1. **Set up webhook receiver on DS1621+:**

   **a. Install dependencies:**
   ```bash
   cd /volume1/docker/nas-player
   pip3 install flask
   ```

   **b. Update `webhook_server.py` with your secret:**
   ```python
   WEBHOOK_SECRET = 'your-strong-secret-key-here'
   ```

   **c. Create systemd service (or use Task Scheduler):**
   ```bash
   sudo nano /etc/systemd/system/nas-player-webhook.service
   ```
   
   Add:
   ```ini
   [Unit]
   Description=NAS Player GitHub Webhook Receiver
   After=network.target
   
   [Service]
   Type=simple
   User=admin
   WorkingDirectory=/volume1/docker/nas-player
   ExecStart=/usr/local/bin/python3 /volume1/docker/nas-player/webhook_server.py
   Restart=always
   Environment="WEBHOOK_SECRET=your-strong-secret-key-here"
   Environment="DEPLOY_SCRIPT=/volume1/docker/nas-player/deploy.sh"
   
   [Install]
   WantedBy=multi-user.target
   ```

   **d. Enable and start service:**
   ```bash
   sudo systemctl enable nas-player-webhook
   sudo systemctl start nas-player-webhook
   ```

2. **Configure GitHub Webhook:**

   **a. Go to your GitHub repository**
   
   **b. Settings → Webhooks → Add webhook**
   
   **c. Configure:**
   - **Payload URL:** `http://your-nas-ip:1700/webhook`
   - **Content type:** `application/json`
   - **Secret:** (same secret you set in webhook_server.py)
   - **Events:** Select "Just the push event"
   - **Active:** ✓ Checked

   **d. Save webhook**

3. **Test the webhook:**
   - Make a test commit and push
   - Check webhook delivery in GitHub (Settings → Webhooks → Recent Deliveries)
   - Check logs on NAS: `sudo journalctl -u nas-player-webhook -f`

### Using Synology Task Scheduler (Alternative):

Instead of systemd, you can use Synology's Task Scheduler:

1. **Control Panel → Task Scheduler → Create → Triggered Task → User-defined script**
2. **General:**
   - Task: `NAS Player Webhook`
   - User: `root`
3. **Task Settings:**
   - Run command:
   ```bash
   /usr/local/bin/python3 /volume1/docker/nas-player/webhook_server.py
   ```
4. **Enable the task**

---

## Method 3: Docker with Auto-Pull (Docker-based)

If using Docker, you can set up automatic image rebuilds:

### Using Docker Compose with Watch:

1. **Update `docker-compose.yml` to include watch:**
   ```yaml
   version: '3.8'
   
   services:
     nas-player:
       build:
         context: https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git#main
         dockerfile: Dockerfile
       # ... rest of config
   ```

2. **Use Watchtower (auto-updates Docker containers):**
   ```bash
   docker run -d \
     --name watchtower \
     --restart unless-stopped \
     -v /var/run/docker.sock:/var/run/docker.sock \
     containrrr/watchtower \
     nas-player --interval 300
   ```

---

## Method 4: Synology Git Server (Built-in)

If you prefer using Synology's built-in tools:

1. **Install Git Server from Package Center**
2. **Create repository on DS1621+**
3. **Set up post-receive hook:**
   ```bash
   # In your Git repository hooks directory
   nano post-receive
   ```
   Add:
   ```bash
   #!/bin/bash
   cd /volume1/docker/nas-player
   git pull
   # Restart service...
   ```

---

## Security Best Practices

1. **Use HTTPS for webhook (set up reverse proxy with SSL)**
2. **Use strong webhook secret**
3. **Restrict webhook access to GitHub IPs only**
4. **Use SSH keys for Git authentication instead of HTTPS**
5. **Run deployment as non-root user**

## Troubleshooting

### Git Pull Fails:
- Check network connectivity
- Verify Git credentials
- Check file permissions

### Webhook Not Triggering:
- Check firewall allows port 1700
- Verify webhook secret matches
- Check webhook delivery logs in GitHub
- Check webhook server logs: `sudo journalctl -u nas-player-webhook -f`

### Deployment Script Fails:
- Check script permissions: `chmod +x deploy.sh`
- Verify paths are correct
- Check logs: `cat /volume1/docker/nas-player/deploy.log`

## Recommended Workflow

1. **Development:** Code on your computer
2. **Commit & Push:** Push to GitHub
3. **Auto-Deploy:** DS1621+ automatically pulls and restarts
4. **Access:** Your changes are live immediately!

---

## Quick Start (Recommended: Method 2 - Webhook)

1. Upload all files to `/volume1/docker/nas-player` on DS1621+
2. Update `deploy.sh` with your GitHub repo URL
3. Update `webhook_server.py` with your secret
4. Start webhook server
5. Configure GitHub webhook
6. Test by pushing a commit!

---

**Note:** For production, consider using HTTPS with SSL certificates for the webhook endpoint.

