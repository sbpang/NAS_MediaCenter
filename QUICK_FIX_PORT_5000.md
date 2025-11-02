# Quick Fix: Port 5000 Already in Use

## Error Message
```
Error starting userland proxy: listen tcp4 0.0.0.0:5000: bind: address already in use
```

## Quick Solutions

### Option 1: Find and Stop the Service (Recommended)

SSH into your NAS and run:

```bash
# Find what's using port 5000
netstat -tuln | grep 5000
# OR
lsof -i :5000
# OR  
ss -tulpn | grep 5000

# Check Docker containers
docker ps -a

# If you see an old nas-player container, stop and remove it:
docker stop nas-player
docker rm nas-player

# Check for Python processes
ps aux | grep "app.py"

# If found, kill it:
pkill -f "python.*app.py"
```

### Option 2: Use Different Port (Fastest)

**Step 1:** Edit docker-compose file

```bash
cd /volume1/docker/nas-player
nano docker-compose.webhook.yml
```

**Step 2:** Change the port mapping (line 11):

**FROM:**
```yaml
      - "5000:5000"
```

**TO:**
```yaml
      - "5002:5000"
```

This uses port 5002 externally (access via `http://NAS_IP:5002`) while keeping 5000 inside the container.

**Step 3:** Save and restart

```bash
# Press Ctrl+X, then Y, then Enter to save in nano

# Restart containers
docker-compose -f docker-compose.webhook.yml down
docker-compose -f docker-compose.webhook.yml up -d --build
```

**Step 4:** Access your app

Use the new port: `http://YOUR_NAS_IP:5002`

### Option 3: Stop All Docker Containers (Nuclear Option)

```bash
# Stop all containers
docker stop $(docker ps -aq)

# Remove all containers (be careful!)
docker rm $(docker ps -aq)

# Then start your services
cd /volume1/docker/nas-player
docker-compose -f docker-compose.webhook.yml up -d --build
```

## Verify Port is Free

After stopping services:

```bash
# Check if port is now free
netstat -tuln | grep 5000
# Should return nothing if port is free
```

## About the Git Warnings

The warnings:
```
WARN[0000] buildx: failed to read current commit information with git rev-parse --is-inside-work-tree
```

These are **harmless** and can be ignored. They occur because Docker buildx tries to check git info during build, but the build context might not be a git repository or git isn't available in the build context. The build will still work fine.

To suppress them (optional), you can:
1. Ignore them (they don't affect functionality)
2. Or build outside a git repo context (not recommended)
3. Or update Docker to latest version

## After Fixing

Once containers start successfully:

```bash
# Verify containers are running
docker ps

# Should see:
# - nas-player (or nas-player-webhook)
# - nas-player-webhook

# Check logs
docker logs nas-player
docker logs nas-player-webhook
```

Then access your media player at the port you configured!

