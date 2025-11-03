# Deployment Troubleshooting Guide for DS1621+

This guide provides steps to diagnose and resolve common issues encountered during deployment when your NAS is not exposed to the internet.

## Quick Diagnosis (Run on NAS via SSH)

```bash
cd /volume1/docker/nas-player

# 1. Check if git has the latest code
git fetch origin
git log HEAD..origin/main --oneline
# If there are commits, they haven't been pulled

# 2. Check current commit vs remote
git log -1 --oneline
# Compare with: https://github.com/sbpang/NAS_MediaCenter/commits/main

# 3. Check if deploy script ran (if using cron/task scheduler)
ls -la deploy.log 2>/dev/null || echo "No deploy.log found"
tail -50 deploy.log 2>/dev/null || echo "No deploy log"
```

## Manual Fix: Force Update

If auto-deployment didn't work, manually update:

```bash
cd /volume1/docker/nas-player

# 1. Pull latest code
git pull origin main

# 2. Verify the files are updated
grep "object-fit" static/styles.css
# Should show: object-fit: contain

# 3. Restart containers to pick up changes
docker-compose restart nas-player

# 4. Verify it's running
docker ps | grep nas-player
docker logs nas-player | tail -10
```

## Common Issues & Fixes

### Issue 1: Cron Job Not Running

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

### Issue 2: Git Pull Fails

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

### Issue 3: Container Restart Doesn't Pick Up Changes

**Symptoms:** Git pull works, but old code still running

**Fix:**
```bash
cd /volume1/docker/nas-player

# Force rebuild and restart
docker-compose down
docker-compose up -d --build

# Verify the mounted code is updated
docker exec nas-player cat /app/static/styles.css | grep "object-fit"
# Should show: object-fit: contain
```

## Verify Deployment Worked

After manual or automatic deployment:

```bash
# 1. Check current commit
cd /volume1/docker/nas-player
git log -1 --oneline

# 2. Verify file content
grep "object-fit: contain" static/styles.css
# Should find it

# 3. Check if container picked it up
docker exec nas-player cat /app/static/styles.css | grep "object-fit"
# Should show: object-fit: contain

# 4. Access via browser and check page source
# View source of the page, look for styles.css
# Hard refresh (Ctrl+F5) to clear cache
```

## Enable Deployment Logging

To see what's happening during deployment:

```bash
# Run deploy script manually with logging
cd /volume1/docker/nas-player
bash deploy.sh 2>&1 | tee deploy.log

# Or check existing log
tail -f deploy.log
```

## Still Not Working?

1. **Check all containers are running:**
   ```bash
   docker ps -a
   ```

2. **Check firewall allows port 1699:**
   - DSM → Control Panel → Security → Firewall
   - Ensure port 1699 is allowed

3. **Manual deployment as last resort:**
   ```bash
   cd /volume1/docker/nas-player
   git pull origin main
   docker-compose restart nas-player
   ```

4. **Check deploy script permissions:**
   ```bash
   chmod +x /volume1/docker/nas-player/deploy.sh
   ```

## Alternative Deployment Methods

If cron/task scheduler isn't working, try:

### Method 1: Manual Deployment
```bash
cd /volume1/docker/nas-player
git pull origin main
docker-compose restart nas-player
```

### Method 2: SSH Script from Local Machine
Create a script on your computer that SSH's into NAS:
```bash
ssh admin@YOUR_NAS_IP "cd /volume1/docker/nas-player && git pull origin main && docker-compose restart nas-player"
```

### Method 3: GitHub Actions (if NAS accessible via SSH from internet)
See SETUP_DS1621.md Step 8 Method E for GitHub Actions setup.
