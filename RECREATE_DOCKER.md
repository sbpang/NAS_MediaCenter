# Recreate Docker Containers After Port Change

After updating ports, you need to recreate your Docker containers.

## Quick Steps (On Your NAS via SSH)

**CRITICAL:** The docker-compose file mounts your code directory (`/volume1/docker/nas-player:/app`), so the code on your NAS MUST be updated first!

```bash
# 1. Navigate to your project directory
cd /volume1/docker/nas-player

# 2. Pull the latest code (THIS IS ESSENTIAL!)
git pull origin main

# 3. Verify the ports are updated in the files
echo "=== Checking app.py port ==="
grep "port=" app.py
# Should show: port=1699

echo "=== Checking docker-compose ports ==="
grep -A 1 "ports:" docker-compose.yml
# Should show: 1699:1699

# 4. Stop and remove existing containers completely
docker-compose down

# 5. Remove old containers if they still exist
docker rm nas-player 2>/dev/null || true

# 6. Check if anything is still using port 1699 and kill it
echo "=== Checking for port 1699 usage ==="
netstat -tuln | grep 1699
# If something is found, stop it:
docker ps -a | grep 1699
pkill -f "python.*app.py" 2>/dev/null || true

# 7. Remove old images to force complete rebuild
docker rmi nas-player 2>/dev/null || true

# 8. NOW rebuild and start with new configuration
docker-compose up -d --build

# 9. Verify containers are running
docker ps

# 10. Check logs to ensure they started correctly
docker logs nas-player
```

## Why This Is Needed

1. **Volume Mount Override**: The docker-compose file mounts `/volume1/docker/nas-player:/app`, which means the code ON YOUR NAS is what runs, not the code in the Docker image! You MUST update the code on your NAS with `git pull` first.
2. **Port Mappings Changed**: The containers were created with old port mappings
3. **Code Updated**: The application code now uses port 1699
4. **Fresh Build Required**: Docker needs to rebuild with the new port configurations

## What Happens

1. `docker-compose down` - Stops and removes the existing containers
2. `docker-compose up -d --build` - Rebuilds images with new code and starts containers with new port mappings

## Verify It Worked

After recreation, verify:

```bash
# Check containers are running
docker ps
# Should show nas-player with port 1699

# Test media player
curl http://localhost:1699

# Check logs for any errors
docker logs nas-player
```

## If You Get Port Already in Use Errors

### Still Getting Port Errors

This means the code on your NAS hasn't been updated yet, or old containers are still running:

```bash
# 1. FIRST: Make sure you pulled the latest code
cd /volume1/docker/nas-player
git pull origin main

# 2. Verify app.py has port 1699
cat app.py | grep "port="
# Should show: port=1699
# If it shows a different port, the code wasn't updated!

# 3. Verify docker-compose.yml has the new ports
cat docker-compose.yml | grep -A 1 "ports:"
# Should show: 1699:1699

# 4. Stop ALL containers and processes using the port
docker ps -a
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true

# 5. Check for any process using the port
netstat -tuln | grep 1699
lsof -i :1699
# Kill any Python processes if found
pkill -f "python.*app.py" || true

# 6. NOW try building again
docker-compose down
docker-compose up -d --build
```

### If Port 1699 Is Already in Use:

```bash
# Find what's using the port
netstat -tuln | grep 1699

# Stop conflicting services or containers
docker stop <container_name>
# OR
pkill -f "python.*app.py"
```

## Update Firewall Rules

Make sure your firewall allows the new port:

1. **DSM → Control Panel → Security → Firewall**
2. Update or create rule for:
   - **Port 1699** (Media Player)

---

**After recreation, your media player will be accessible at:**
- `http://YOUR_NAS_IP:1699`
