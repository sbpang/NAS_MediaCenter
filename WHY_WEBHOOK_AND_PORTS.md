# Why Webhook? Why Two Ports?

## What is the Webhook For?

The **webhook** enables **automatic deployment** to your DS1621+ NAS. Here's how it works:

### Without Webhook (Manual Deployment):
1. You make code changes locally
2. Push to GitHub ✅
3. **You manually SSH into NAS**
4. **You manually run `git pull`**
5. **You manually restart Docker containers**

### With Webhook (Automatic Deployment):
1. You make code changes locally
2. Push to GitHub ✅
3. **GitHub automatically sends a webhook to your NAS**
4. **NAS automatically runs `git pull`**
5. **NAS automatically rebuilds and restarts containers**

**Result:** Your changes go live automatically within seconds of pushing to GitHub! 🚀

## How It Works

```
Your Computer           GitHub            Your NAS (DS1621+)
     |                    |                       |
     | 1. git push        |                       |
     |------------------->|                       |
     |                    |                       |
     |                    | 2. Webhook Event      |
     |                    |---------------------->|
     |                    |                       | 3. Trigger deploy.sh
     |                    |                       | 4. git pull
     |                    |                       | 5. docker-compose up
     |                    |                       |
     |                    | 6. Response           |
     |                    |<----------------------|
     |                    |                       |
```

## Why Two Ports?

You need **two separate ports** because you have **two separate services**:

### Port 1699 - Media Player (Main Application)
- **What it does:** Serves your media player web interface
- **Who uses it:** You and anyone accessing the media center
- **Access:** `http://YOUR_NAS_IP:1699`
- **Contains:** 
  - HTML/CSS/JavaScript frontend
  - API endpoints for listing artists/videos
  - Video/audio streaming

### Port 1700 - Webhook Receiver
- **What it does:** Receives webhook notifications from GitHub
- **Who uses it:** GitHub (when you push code)
- **Access:** `http://YOUR_NAS_IP:1700/webhook`
- **Contains:**
  - Webhook endpoint (`/webhook`)
  - Health check endpoint (`/health`)
  - Deployment trigger logic

### Why Separate?

1. **Security:** Webhook runs on separate port, can be restricted to GitHub IPs only
2. **Isolation:** If webhook has issues, media player keeps running
3. **Clear separation:** Different purposes = different ports
4. **Scalability:** Could run on different servers if needed

### Can I Use Just One Port?

**Technically yes**, but not recommended:
- You'd need to route webhook through media player (more complex)
- Security risk (webhook exposed on main app port)
- If media player crashes, webhook also stops
- Less flexible for future expansion

## Summary

- **Webhook = Auto-deployment magic** ✨
  - Push code → GitHub notifies NAS → NAS updates automatically

- **Two Ports = Two Services** 🔌
  - Port 1699: Your media player (for you)
  - Port 1700: Webhook receiver (for GitHub)

---

**Want to disable webhook?** Just don't configure the GitHub webhook, and your media player on port 1699 will still work perfectly fine!

