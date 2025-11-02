# Recreate Docker Containers After Port Change

After updating ports from 5000/5001 to 1699/1700, you need to recreate your Docker containers.

## Quick Steps (On Your NAS via SSH)

**IMPORTANT:** The docker-compose file mounts your code directory, so you MUST update the code on the NAS first!

```bash
# 1. Navigate to your project directory
cd /volume1/docker/nas-player

# 2. Pull the latest code (THIS IS CRITICAL!)
git pull origin main

# 3. Verify app.py has the new port (should show port=1699)
grep "port=" app.py

# 4. Stop and remove existing containers completely
docker-compose -f docker-compose.webhook.yml down

# 5. Remove old containers if they exist
docker rm nas-player nas-player-webhook 2>/dev/null || true

# 6. Remove old images to force complete rebuild
docker rmi nas-player nas-player-webhook 2>/dev/null || true

# 7. Check if port 5000 is still in use (stop it if found)
netstat -tuln | grep 5000
# If something is using it, stop it:
docker ps -a | grep 5000
docker stop <old_container> 2>/dev/null || true

# 8. Rebuild and start with new configuration
docker-compose -f docker-compose.webhook.yml up -d --build

# 9. Verify containers are running
docker ps

# 10. Check logs to ensure they started correctly
docker logs nas-player
docker logs nas-player-webhook
```

## Why This Is Needed

1. **Volume Mount Override**: The docker-compose file mounts `/volume1/docker/nas-player:/app`, so the code on your NAS must be updated with `git pull` first!
2. **Port Mappings Changed**: The containers were created with old port mappings (5000:5000, 5001:5001)
3. **Code Updated**: The application code now uses ports 1699 and 1700
4. **Fresh Build Required**: Docker needs to rebuild with the new port configurations
5. **Old Containers**: May still be running with old port configuration

## What Happens

1. `docker-compose down` - Stops and removes the existing containers
2. `docker-compose up -d --build` - Rebuilds images with new code and starts containers with new port mappings

## Verify It Worked

After recreation, verify:

```bash
# Check containers are running
docker ps
# Should show nas-player and nas-player-webhook with ports 1699 and 1700

# Test media player
curl http://localhost:1699

# Test webhook health
curl http://localhost:1700/health

# Check logs for any errors
docker logs nas-player
docker logs nas-player-webhook
```

## If You Get Port Already in Use Errors

### Still Seeing Port 5000 Error (Like You Are Now)

This means the code on your NAS hasn't been updated yet, or old containers are still running:

```bash
# 1. Make sure you pulled the latest code
cd /volume1/docker/nas-player
git pull origin main

# 2. Verify app.py has port 1699
cat app.py | grep "port="
# Should show: port=1699

# 3. Stop ALL containers using port 5000
docker ps -a | grep 5000
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true

# 4. Check for any process using port 5000
netstat -tuln | grep 5000
lsof -i :5000
# Kill any Python processes if found
pkill -f "python.*app.py" || true

# 5. Now try building again
docker-compose -f docker-compose.webhook.yml down
docker-compose -f docker-compose.webhook.yml up -d --build
```

### If Port 1699 or 1700 Is Already in Use:

```bash
# Find what's using the port
netstat -tuln | grep 1699
netstat -tuln | grep 1700

# Stop conflicting services or containers
docker stop <container_name>
# OR
pkill -f "python.*app.py"
```

## Update GitHub Webhook (If Already Configured)

If you already set up the GitHub webhook, update it:

1. Go to: `https://github.com/sbpang/NAS_MediaCenter/settings/hooks`
2. Click on your webhook
3. Update **Payload URL** from:
   - `http://YOUR_NAS_IP:5001/webhook`
   - To: `http://YOUR_NAS_IP:1700/webhook`
4. Save

## Update Firewall Rules

Make sure your firewall allows the new ports:

1. **DSM → Control Panel → Security → Firewall**
2. Update or create rules for:
   - **Port 1699** (Media Player)
   - **Port 1700** (Webhook Receiver)

---

**After recreation, your media player will be accessible at:**
- `http://YOUR_NAS_IP:1699`

**Webhook endpoint:**
- `http://YOUR_NAS_IP:1700/webhook`

