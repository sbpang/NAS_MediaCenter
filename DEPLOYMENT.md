# Deployment Guide

Complete guide for deploying and updating the NAS Media Center on your Synology DS1621+.

## Table of Contents

- [Initial Deployment](#initial-deployment)
- [Automatic Deployment Methods](#automatic-deployment-methods)
- [Manual Deployment](#manual-deployment)
- [Troubleshooting](#troubleshooting)
- [Common Issues](#common-issues)

## Initial Deployment

### Quick Setup

```bash
# 1. Create deployment directory
sudo mkdir -p /volume1/docker/nas-player
sudo chown -R admin:users /volume1/docker/nas-player
cd /volume1/docker/nas-player

# 2. Clone repository
git clone https://github.com/sbpang/NAS_MediaCenter.git .

# 3. Make deploy script executable
chmod +x deploy.sh

# 4. Start Docker service
docker-compose up -d --build

# 5. Verify container is running
docker ps
docker logs nas-player
```

See [SETUP_DS1621.md](SETUP_DS1621.md) for detailed setup instructions.

## Automatic Deployment Methods

Since your NAS is not exposed to the internet, GitHub webhooks cannot reach it. Here are practical alternatives:

### Method A: Cron Job (Recommended)

Set up a cron job that periodically checks for updates and deploys automatically.

**Setup:**
```bash
cd /volume1/docker/nas-player

# Edit crontab
crontab -e

# Add one of these lines (choose your preferred frequency):

# Check every 30 minutes:
*/30 * * * * cd /volume1/docker/nas-player && /volume1/docker/nas-player/deploy.sh >> /volume1/docker/nas-player/deploy.log 2>&1

# Check every hour:
0 * * * * cd /volume1/docker/nas-player && /volume1/docker/nas-player/deploy.sh >> /volume1/docker/nas-player/deploy.log 2>&1

# Check once per day at 3 AM:
0 3 * * * cd /volume1/docker/nas-player && /volume1/docker/nas-player/deploy.sh >> /volume1/docker/nas-player/deploy.log 2>&1
```

**View logs:**
```bash
tail -f /volume1/docker/nas-player/deploy.log
```

**Pros:**
- ✅ Fully automatic
- ✅ No manual intervention needed
- ✅ Works even when you're away

**Cons:**
- ⏱️ Not immediate (up to your check interval)
- 📝 Requires SSH access to setup

---

### Method B: Synology Task Scheduler (GUI Method)

Use Synology's built-in Task Scheduler for a GUI-based approach.

**Setup:**

1. **Open DSM → Control Panel → Task Scheduler**
2. **Create → Scheduled Task → User-defined script**
3. **General Tab:**
   - Task: `NAS Media Player Auto-Update`
   - User: `admin`
   - Enabled: ✓
4. **Schedule Tab:**
   - Frequency: `Daily` or `Weekly`
   - Time: Your preferred time (e.g., 3:00 AM)
5. **Task Settings Tab:**
   - **Run command:**
     ```bash
     /volume1/docker/nas-player/deploy.sh
     ```
6. **Save** and enable the task

**Pros:**
- ✅ GUI-based, easy to configure
- ✅ Can schedule at specific times
- ✅ Can see task history in DSM

**Cons:**
- ⏱️ Not immediate
- 🖥️ Requires DSM web interface access

---

### Method C: Manual Deployment (On-Demand)

SSH into your NAS and deploy manually whenever you push updates.

**IMPORTANT:** Since the code is copied into the Docker image during build (not mounted), you MUST rebuild the container to see changes.

**Workflow:**

```bash
# SSH into your NAS
ssh admin@YOUR_NAS_IP

# Navigate to project directory
cd /volume1/docker/nas-player

# Pull latest code from GitHub
git pull origin main

# Rebuild and restart the container (REQUIRED - restart alone won't work!)
docker-compose up -d --build

# Verify the container is running with new code
docker ps
docker logs nas-player | tail -20
```

**Alternative (if rebuild is slow, force rebuild):**
```bash
cd /volume1/docker/nas-player
git pull origin main

# Force complete rebuild (removes old image first)
docker-compose down
docker-compose up -d --build --force-recreate

# Verify
docker logs nas-player | tail -20
```

**Verify Changes Were Applied:**
```bash
# Check if new code is in the container
docker exec nas-player cat /app/app.py | head -30

# Or check a specific file that changed
docker exec nas-player cat /app/static/player.js | grep "PIXELS_PER_MINUTE"
```

**Browser Cache Note:**
After deployment, hard refresh your browser (Ctrl+F5 or Cmd+Shift+R) to clear cache and see changes.

**Pros:**
- ✅ Immediate deployment
- ✅ Full control
- ✅ No setup required

**Cons:**
- 📝 Requires manual SSH access each time
- ⚠️ Easy to forget
- 🔄 Requires rebuild (takes longer than restart)

---

### Method D: SSH Script from Local Machine (Semi-Automatic)

Create a script on your local machine that automatically deploys after you push.

**Windows PowerShell Script (`deploy-to-nas.ps1`):**
```powershell
# Replace with your NAS IP
$NAS_IP = "192.168.1.100"
$NAS_USER = "admin"

# SSH and deploy
ssh ${NAS_USER}@${NAS_IP} "cd /volume1/docker/nas-player && git pull origin main && docker-compose restart nas-player"

Write-Host "Deployment complete!" -ForegroundColor Green
```

**Usage:**
```powershell
# After pushing to GitHub
git push origin main
.\deploy-to-nas.ps1
```

**Linux/Mac Bash Script (`deploy-to-nas.sh`):**
```bash
#!/bin/bash
# Replace with your NAS IP
NAS_IP="192.168.1.100"
NAS_USER="admin"

# SSH and deploy
ssh ${NAS_USER}@${NAS_IP} "cd /volume1/docker/nas-player && git pull origin main && docker-compose restart nas-player"

echo "Deployment complete!"
```

**Make executable and use:**
```bash
chmod +x deploy-to-nas.sh
git push origin main
./deploy-to-nas.sh
```

**Setup SSH Key (One-Time):**
```bash
# On your local machine, generate SSH key if you don't have one
ssh-keygen -t ed25519 -C "your_email@example.com"

# Copy public key to NAS
ssh-copy-id admin@YOUR_NAS_IP

# Test passwordless login
ssh admin@YOUR_NAS_IP "echo 'SSH key works!'"
```

**Pros:**
- ✅ Almost automatic (one command after push)
- ✅ Immediate deployment
- ✅ Works from your development machine

**Cons:**
- 📝 Requires SSH key setup (passwordless login recommended)
- 💻 Must be on your local machine

---

### Method E: GitHub Actions with SSH (Advanced)

Use GitHub Actions to automatically SSH into your NAS after pushing.

**Setup:**

1. **Generate SSH Key Pair:**
   ```bash
   ssh-keygen -t ed25519 -f nas_deploy_key -C "github-actions"
   # This creates: nas_deploy_key (private) and nas_deploy_key.pub (public)
   ```

2. **Add Public Key to NAS:**
   ```bash
   # On NAS
   mkdir -p ~/.ssh
   chmod 700 ~/.ssh
   echo "PASTE_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```

3. **Add Secrets to GitHub:**
   - Go to: `https://github.com/sbpang/NAS_MediaCenter/settings/secrets/actions`
   - Add:
     - `NAS_IP`: Your NAS IP address
     - `NAS_SSH_KEY`: Contents of `nas_deploy_key` (private key)

4. **Create GitHub Actions Workflow:**

   Create `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy to NAS
   on:
     push:
       branches: [ main ]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - name: Deploy via SSH
           uses: appleboy/ssh-action@master
           with:
             host: ${{ secrets.NAS_IP }}
             username: admin
             key: ${{ secrets.NAS_SSH_KEY }}
             script: |
               cd /volume1/docker/nas-player
               git pull origin main
               docker-compose restart nas-player
   ```

**Pros:**
- ✅ Fully automatic from GitHub
- ✅ Immediate deployment
- ✅ Works from anywhere (even mobile)

**Cons:**
- 🔐 Requires SSH key setup
- 🌐 NAS must be accessible from internet (or use VPN/Tailscale)
- ⚙️ More complex setup

**Note:** If your NAS is behind NAT/firewall, you'll need:
- Port forwarding (not recommended for security)
- VPN (Tailscale, WireGuard)
- Dynamic DNS if IP changes

---

## Comparison Table

| Method | Setup Difficulty | Automation | Speed | Best For |
|--------|-----------------|------------|--------|----------|
| **A: Cron Job** | Easy | Full | Delayed | Set-and-forget |
| **B: Task Scheduler** | Easy | Full | Delayed | GUI users |
| **C: Manual** | None | None | Immediate | Occasional updates |
| **D: SSH Script** | Medium | Semi | Immediate | Developers |
| **E: GitHub Actions** | Hard | Full | Immediate | Advanced users |

**Recommended Setup:**
- **Primary:** Method A (Cron Job) - Check every hour
- **Fallback:** Method C (Manual) - When you need immediate updates

---

## Manual Deployment

### Fresh Start (After Deleting Directory)

```bash
# 1. Create the directory
sudo mkdir -p /volume1/docker/nas-player
sudo chown -R admin:users /volume1/docker/nas-player
cd /volume1/docker/nas-player

# 2. Clone the repository
git clone https://github.com/sbpang/NAS_MediaCenter.git .

# 3. Verify the port is correct
grep "port=" app.py
# Should show: port=1699

grep -A 1 "ports:" docker-compose.yml
# Should show: 1699:1699

# 4. Make deploy script executable
chmod +x deploy.sh

# 5. Start Docker service
docker-compose up -d --build

# 6. Verify container is running
docker ps

# 7. Check logs to ensure everything started correctly
docker logs nas-player
```

### Recreating Docker Containers (After Configuration Changes)

**CRITICAL:** The docker-compose file mounts your code directory (`/volume1/docker/nas-player:/app`), so the code on your NAS MUST be updated first!

```bash
# 1. Navigate to your project directory
cd /volume1/docker/nas-player

# 2. Pull the latest code (THIS IS ESSENTIAL!)
git pull origin main

# 3. Verify the ports are updated in the files
grep "port=" app.py
grep -A 1 "ports:" docker-compose.yml

# 4. Stop and remove existing containers completely
docker-compose down

# 5. Remove old containers if they still exist
docker rm nas-player 2>/dev/null || true

# 6. Remove old images to force complete rebuild
docker rmi nas-player 2>/dev/null || true

# 7. NOW rebuild and start with new configuration
docker-compose up -d --build

# 8. Verify containers are running
docker ps

# 9. Check logs to ensure they started correctly
docker logs nas-player
```

---

## Troubleshooting

### Quick Diagnosis

```bash
cd /volume1/docker/nas-player

# 1. Check if git has the latest code
git fetch origin
git log HEAD..origin/main --oneline
# If there are commits, they haven't been pulled

# 2. Check current commit vs remote
git log -1 --oneline

# 3. Check if deploy script ran (if using cron/task scheduler)
ls -la deploy.log 2>/dev/null || echo "No deploy.log found"
tail -50 deploy.log 2>/dev/null || echo "No deploy log"
```

### Force Update

If auto-deployment didn't work, manually update:

```bash
cd /volume1/docker/nas-player

# 1. Pull latest code
git pull origin main

# 2. Restart containers to pick up changes
docker-compose restart nas-player

# 3. Verify it's running
docker ps | grep nas-player
docker logs nas-player | tail -10
```

---

## Common Issues

### Git Ownership Issue

If you see the error: `fatal: detected dubious ownership in repository`

**Quick Fix:**
```bash
cd /volume1/docker/nas-player
git config --global --add safe.directory /volume1/docker/nas-player
git fetch origin
git status
```

**Permanent Fix:**
```bash
cd /volume1/docker/nas-player
sudo chown -R admin:users /volume1/docker/nas-player
```

**For Docker Container:**
```bash
docker exec nas-player git config --global --add safe.directory /app
```

The deploy script (`deploy.sh`) automatically fixes this issue.

---

### Cron Job Not Running

**Symptoms:** Auto-deployment never happens

**Fix:**
```bash
# Check if cron is running
ps aux | grep cron

# Check cron logs
grep CRON /var/log/syslog

# Verify crontab entry
crontab -l

# Test deploy script manually
bash /volume1/docker/nas-player/deploy.sh

# Check deploy log
tail -f /volume1/docker/nas-player/deploy.log
```

---

### Git Pull Fails

**Symptoms:** Deploy script runs but git pull fails

**Fix:**
```bash
cd /volume1/docker/nas-player

# Check git status
git status

# If there are local changes, reset:
git reset --hard origin/main
git pull origin main

# Check permissions
ls -la .git

# Fix Git ownership if needed
git config --global --add safe.directory /volume1/docker/nas-player
```

---

### Divergent Branches (Force Push Detected)

**Symptoms:** `fatal: Need to specify how to reconcile divergent branches` or `forced update` message

This happens when the remote branch was force-pushed (history rewritten).

**Fix (Recommended for Deployment):**

Reset local branch to match remote exactly:

```bash
cd /volume1/docker/nas-player

# Fetch latest from remote
git fetch origin

# Reset local branch to match remote exactly (discards local changes)
git reset --hard origin/main

# Verify you're now in sync
git status
git log -1 --oneline
```

**Alternative (If you want to keep local changes):**

```bash
cd /volume1/docker/nas-player

# Configure git to use merge strategy
git config pull.rebase false

# Then pull
git pull origin main

# If conflicts occur, resolve them or reset to remote:
# git reset --hard origin/main
```

**For Deployment:** Always use `git reset --hard origin/main` to ensure your NAS matches GitHub exactly.

---

### Complete Reset (Drop Everything)

If you need to completely reset your local repository to match the remote exactly, removing all local changes and untracked files:

```bash
cd /volume1/docker/nas-player

# Fetch latest
git fetch origin

# Reset to match remote exactly (drops all local commits and changes)
git reset --hard origin/main

# Remove all untracked files and directories
git clean -fd

# Verify everything is clean
git status
```

**Warning:** This will permanently delete:
- All local commits not on remote
- All uncommitted changes
- All untracked files and directories

Use this when you want a completely fresh start matching GitHub exactly.

---

### Container Restart Doesn't Pick Up Changes

**Symptoms:** Git pull works, but old code still running

**Fix:**
```bash
cd /volume1/docker/nas-player

# Force rebuild and restart
docker-compose down
docker-compose up -d --build

# Verify the mounted code is updated
docker exec nas-player cat /app/static/styles.css | head -5
```

---

### Port Already in Use

**Symptoms:** `Error starting userland proxy: listen tcp4 0.0.0.0:1699: bind: address already in use`

**Fix:**
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

# If it's a Python process:
ps aux | grep "app.py"
pkill -f "python.*app.py"
```

**Alternative:** Use a different port in `docker-compose.yml`:
```yaml
ports:
  - "1701:1699"  # External port 1701, internal port 1699
```

---

### Git Not Found

**Symptoms:** `git: command not found`

**Fix:**
```bash
# Check if Git is installed
which git

# If not found, install via Package Center:
# 1. Open DSM → Package Center
# 2. Search for "Git Server"
# 3. Install it

# Or try command line:
sudo synopkg install git
sudo synopkg install GitServer

# Verify installation
git --version

# If Git Server package is installed but git command not found:
# Check if it's in a different location:
/usr/local/bin/git --version
# If that works, create symlink:
sudo ln -s /usr/local/bin/git /usr/bin/git
```

---

### Permission Issues

**Fix:**
```bash
# Fix permissions
sudo chown -R admin:users /volume1/docker/nas-player
chmod -R 755 /volume1/docker/nas-player
chmod +x /volume1/docker/nas-player/deploy.sh
```

---

## Verify Deployment Worked

After manual or automatic deployment:

```bash
# 1. Check current commit
cd /volume1/docker/nas-player
git log -1 --oneline

# 2. Check if container picked it up
docker exec nas-player cat /app/app.py | grep "VIDEO_SERVER_PATH"

# 3. Access via browser and check
# Hard refresh (Ctrl+F5) to clear cache
```

---

## Maintenance

### View Logs
```bash
# Media player logs
docker logs -f nas-player

# Deployment logs
tail -f /volume1/docker/nas-player/deploy.log
```

### Restart Services
```bash
cd /volume1/docker/nas-player
docker-compose restart
```

### Update Manually
```bash
cd /volume1/docker/nas-player
git pull origin main
docker-compose restart nas-player
# Or rebuild if needed:
docker-compose up -d --build
```

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

# Check cron job
crontab -l
tail -f /volume1/docker/nas-player/deploy.log
```

---

**Need Help?** Check [SETUP_DS1621.md](SETUP_DS1621.md) for detailed setup instructions or [README.md](README.md) for overview.

