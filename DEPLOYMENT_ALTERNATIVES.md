# Deployment Alternatives (For Non-Exposed NAS)

Since your NAS is not exposed to the internet, GitHub webhooks cannot reach it. Here are practical alternatives for deploying updates.

## Recommended: Method A - Cron Job (Automatic, Periodic)

Set up a cron job that periodically checks for updates and deploys automatically.

### Setup (On NAS via SSH)

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

### View Deployment Logs

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

## Method B: Synology Task Scheduler (GUI Method)

Use Synology's built-in Task Scheduler for a GUI-based approach.

### Setup

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

## Method C: Manual Deployment (On-Demand)

SSH into your NAS and deploy manually whenever you push updates.

### Workflow

**After pushing to GitHub:**
```bash
# SSH into your NAS
ssh admin@YOUR_NAS_IP

# Navigate and deploy
cd /volume1/docker/nas-player
git pull origin main
docker-compose restart nas-player
```

**Pros:**
- ✅ Immediate deployment
- ✅ Full control
- ✅ No setup required

**Cons:**
- 📝 Requires manual SSH access each time
- ⚠️ Easy to forget

---

## Method D: SSH Script from Local Machine (Semi-Automatic)

Create a script on your local machine that automatically deploys after you push.

### Windows PowerShell Script

**Create `deploy-to-nas.ps1`:**
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

### Linux/Mac Bash Script

**Create `deploy-to-nas.sh`:**
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

# After pushing to GitHub
git push origin main
./deploy-to-nas.sh
```

**Pros:**
- ✅ Almost automatic (one command after push)
- ✅ Immediate deployment
- ✅ Works from your development machine

**Cons:**
- 📝 Requires SSH key setup (passwordless login recommended)
- 💻 Must be on your local machine

**Setup SSH Key (One-Time):**
```bash
# On your local machine, generate SSH key if you don't have one
ssh-keygen -t ed25519 -C "your_email@example.com"

# Copy public key to NAS
ssh-copy-id admin@YOUR_NAS_IP

# Test passwordless login
ssh admin@YOUR_NAS_IP "echo 'SSH key works!'"
```

---

## Method E: GitHub Actions with SSH (Advanced)

Use GitHub Actions to automatically SSH into your NAS after pushing.

### Setup

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

---

## Recommended Setup

For most users, I recommend:

1. **Primary:** Method A (Cron Job) - Check every hour
2. **Fallback:** Method C (Manual) - When you need immediate updates

This gives you automatic updates most of the time, with the flexibility to deploy immediately when needed.

---

## Troubleshooting

### Cron Job Not Running

```bash
# Check cron service
ps aux | grep cron

# Check crontab entry
crontab -l

# Test deploy script manually
bash /volume1/docker/nas-player/deploy.sh

# Check logs
tail -f /volume1/docker/nas-player/deploy.log
```

### SSH Connection Issues

```bash
# Test SSH connection
ssh admin@YOUR_NAS_IP "echo 'Connection test'"

# Check SSH key
ssh -v admin@YOUR_NAS_IP

# Verify authorized_keys
ssh admin@YOUR_NAS_IP "cat ~/.ssh/authorized_keys"
```

---

**Choose the method that best fits your workflow!**

