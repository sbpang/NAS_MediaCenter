# Fresh Start Setup (After Deleting Directory)

Since you deleted `/volume1/docker/nas-player`, here's how to set everything up fresh with the new ports (1699/1700).

## Complete Setup Steps (On Your NAS via SSH)

```bash
# 1. Create the directory
sudo mkdir -p /volume1/docker/nas-player
sudo chown -R admin:users /volume1/docker/nas-player
cd /volume1/docker/nas-player

# 2. Clone the repository (this will have all the port changes already)
git clone https://github.com/sbpang/NAS_MediaCenter.git .

# 3. Verify the ports are correct (they should be 1699/1700)
echo "=== Verifying app.py port ==="
grep "port=" app.py
# Should show: port=1699

echo "=== Verifying webhook_server.py port ==="
grep "port=" webhook_server.py
# Should show: port=1700

echo "=== Verifying docker-compose ports ==="
grep -A 1 "ports:" docker-compose.webhook.yml
# Should show: 1699:1699 and 1700:1700

# 4. Make deploy script executable
chmod +x deploy.sh

# 5. Create .env file for webhook secret (optional but recommended)
# Generate a secret or use one you already have
python3 -c "import secrets; print(secrets.token_urlsafe(32))" 2>/dev/null || echo "your-secret-key-here"

# Create .env file
cat > .env << 'EOF'
WEBHOOK_SECRET=your-secret-key-here
DEPLOY_SCRIPT=/app/deploy.sh
EOF

# Edit .env to replace 'your-secret-key-here' with your actual secret
nano .env
# Press Ctrl+X, then Y, then Enter to save

# 6. Start Docker services
docker-compose -f docker-compose.webhook.yml up -d --build

# 7. Verify containers are running
docker ps
# You should see:
# - nas-player (port 1699)
# - nas-player-webhook (port 1700)

# 8. Check logs to ensure everything started correctly
docker logs nas-player
docker logs nas-player-webhook

# 9. Test the services
curl http://localhost:1699
curl http://localhost:1700/health
```

## What to Expect

✅ **No port 5000 errors** - Everything uses 1699/1700 now  
✅ **Clean start** - No old containers or configurations  
✅ **Latest code** - All port changes are already in the repository  

## Verify It's Working

After setup, test:

```bash
# From your browser or another machine:
http://YOUR_NAS_IP:1699
# Should show the media player interface

# Webhook health check:
curl http://YOUR_NAS_IP:1700/health
# Should return: {"status":"ok"}
```

## Next Steps

1. **Configure Firewall:**
   - DSM → Control Panel → Security → Firewall
   - Allow port **1699** (Media Player)
   - Allow port **1700** (Webhook Receiver)

2. **Set up GitHub Webhook** (for auto-deployment):
   - Go to: https://github.com/sbpang/NAS_MediaCenter/settings/hooks
   - Add webhook with URL: `http://YOUR_NAS_IP:1700/webhook`
   - Secret: (use the one from your .env file)
   - Events: Just the push event

3. **Test Auto-Deployment:**
   - Make a small change locally
   - Push to GitHub
   - Watch it auto-deploy on your NAS!

---

**Your media player is now accessible at:** `http://YOUR_NAS_IP:1699`

