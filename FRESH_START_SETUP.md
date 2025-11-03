# Fresh Start Setup (After Deleting Directory)

Since you deleted `/volume1/docker/nas-player`, here's how to set everything up fresh.

## Complete Setup Steps (On Your NAS via SSH)

```bash
# 1. Create the directory
sudo mkdir -p /volume1/docker/nas-player
sudo chown -R admin:users /volume1/docker/nas-player
cd /volume1/docker/nas-player

# 2. Clone the repository
git clone https://github.com/sbpang/NAS_MediaCenter.git .

# 3. Verify the port is correct
echo "=== Verifying app.py port ==="
grep "port=" app.py
# Should show: port=1699

echo "=== Verifying docker-compose ports ==="
grep -A 1 "ports:" docker-compose.yml
# Should show: 1699:1699

# 4. Make deploy script executable
chmod +x deploy.sh

# 5. Start Docker service
docker-compose up -d --build

# 6. Verify container is running
docker ps
# You should see:
# - nas-player (port 1699)

# 7. Check logs to ensure everything started correctly
docker logs nas-player

# 8. Test the service
curl http://localhost:1699
```

## What to Expect

✅ **No port conflicts** - Everything uses port 1699  
✅ **Clean start** - No old containers or configurations  
✅ **Latest code** - All changes are already in the repository  

## Verify It's Working

After setup, test:

```bash
# From your browser or another machine:
http://YOUR_NAS_IP:1699
# Should show the media player interface
```

## Next Steps

1. **Configure Firewall:**
   - DSM → Control Panel → Security → Firewall
   - Allow port **1699** (Media Player)

2. **Set up Auto-Deployment** (see SETUP_DS1621.md Step 8):
   - Option A: Cron job (recommended)
   - Option B: Synology Task Scheduler
   - Option C: Manual deployment
   - Option D: SSH script from local machine

---

**Your media player is now accessible at:** `http://YOUR_NAS_IP:1699`
