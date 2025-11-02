# Troubleshooting: DS1621+ Not Getting Latest Code

If your NAS isn't updating after pushing to GitHub, follow these steps:

## Quick Diagnosis (Run on NAS via SSH)

```bash
cd /volume1/docker/nas-player

# 1. Check if webhook received the push
docker logs nas-player-webhook | tail -20

# 2. Check if git has the latest code
git fetch origin
git log HEAD..origin/main --oneline
# If there are commits, they haven't been pulled

# 3. Check current commit vs remote
git log -1 --oneline
# Compare with: https://github.com/sbpang/NAS_MediaCenter/commits/main

# 4. Check if deploy script ran
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
docker-compose -f docker-compose.webhook.yml restart nas-player

# 4. Verify it's running
docker ps | grep nas-player
docker logs nas-player | tail -10
```

## Check Webhook Status

### On GitHub:
1. Go to: https://github.com/sbpang/NAS_MediaCenter/settings/hooks
2. Click on your webhook
3. Scroll to "Recent Deliveries"
4. Check the latest delivery:
   - ✅ Green = Success
   - ❌ Red = Failed (check the error)

### On NAS:
```bash
# Check webhook container logs
docker logs nas-player-webhook

# Look for:
# - "Webhook received" messages
# - Any errors
# - Deployment script output
```

## Common Issues & Fixes

### Issue 1: Webhook Not Triggering

**Symptoms:** No webhook deliveries in GitHub, no logs on NAS

**Fix:**
```bash
# Check webhook container is running
docker ps | grep webhook

# If not running:
docker-compose -f docker-compose.webhook.yml up -d webhook

# Test webhook manually:
curl http://localhost:1700/health
# Should return: {"status":"ok"}
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
```

### Issue 3: Container Restart Doesn't Pick Up Changes

**Symptoms:** Git pull works, but old code still running

**Fix:**
```bash
cd /volume1/docker/nas-player

# Force rebuild and restart
docker-compose -f docker-compose.webhook.yml down
docker-compose -f docker-compose.webhook.yml up -d --build nas-player

# Verify the mounted code is updated
docker exec nas-player cat /app/static/styles.css | grep "object-fit"
# Should show: object-fit: contain
```

### Issue 4: Webhook Secret Mismatch

**Symptoms:** Webhook shows 401 Unauthorized in GitHub

**Fix:**
1. Check `.env` file on NAS:
   ```bash
   cat /volume1/docker/nas-player/.env
   ```

2. Compare with GitHub webhook secret:
   - GitHub: Settings → Webhooks → Your webhook → Show secret
   - They must match exactly

3. If they don't match:
   - Update `.env` on NAS, OR
   - Update secret in GitHub
   - Restart webhook container:
     ```bash
     docker-compose -f docker-compose.webhook.yml restart webhook
     ```

## Test Webhook Manually

To test if webhook is working:

```bash
# On your NAS, check webhook logs in real-time
docker logs -f nas-player-webhook

# Then push a test commit from your computer
# You should see logs appear on the NAS
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
# Modify deploy.sh to log to file
cd /volume1/docker/nas-player
cat deploy.sh | grep -A 5 "Starting deployment"

# Or run deploy script manually with logging
bash deploy.sh 2>&1 | tee deploy.log
```

## Still Not Working?

1. **Check all containers are running:**
   ```bash
   docker ps -a
   ```

2. **Check webhook URL is accessible:**
   ```bash
   curl http://192.168.50.213:1700/health
   ```

3. **Check firewall allows port 1700:**
   - DSM → Control Panel → Security → Firewall
   - Ensure port 1700 is allowed

4. **Manual deployment as last resort:**
   ```bash
   cd /volume1/docker/nas-player
   git pull origin main
   docker-compose -f docker-compose.webhook.yml restart nas-player
   ```

