# Recreate Docker Containers After Port Change

After updating ports from 5000/5001 to 1699/1700, you need to recreate your Docker containers.

## Quick Steps (On Your NAS via SSH)

```bash
# Navigate to your project directory
cd /volume1/docker/nas-player

# Stop and remove existing containers
docker-compose -f docker-compose.webhook.yml down

# Optional: Remove old images to force rebuild
docker rmi nas-player nas-player-webhook 2>/dev/null || true

# Rebuild and start with new configuration
docker-compose -f docker-compose.webhook.yml up -d --build

# Verify containers are running
docker ps

# Check logs to ensure they started correctly
docker logs nas-player
docker logs nas-player-webhook
```

## Why This Is Needed

1. **Port Mappings Changed**: The containers were created with old port mappings (5000:5000, 5001:5001)
2. **Code Updated**: The application code now uses ports 1699 and 1700
3. **Fresh Build Required**: Docker needs to rebuild with the new port configurations

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

If port 1699 or 1700 is already in use:

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

