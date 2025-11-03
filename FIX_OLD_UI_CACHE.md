# Fix: Old UI Still Showing After Deletion

## Problem
You deleted UI files from Git, but the old UI still shows when accessing `192.168.50.213:1699`.

## Root Cause
The Docker container has the old files **baked into the image** from when it was last built. Docker doesn't automatically update when you delete files in Git.

## Solution Steps

### Step 1: Pull Latest Code on NAS (Files Will Be Missing - That's OK)
```bash
# SSH into your NAS
ssh admin@192.168.50.213

# Navigate to project directory
cd /volume1/docker/nas-player

# Pull latest code (will show deletion)
git pull origin main
```

### Step 2: Rebuild Docker Container (Without Static Files)
```bash
# Stop the container
docker-compose down

# Remove old image to force rebuild
docker rmi nas-player 2>/dev/null || true

# Rebuild with current code (no static files)
docker-compose up -d --build
```

### Step 3: Clear Browser Cache
**Important:** Your browser cached the old files!

**Chrome/Edge:**
- Press `Ctrl + Shift + Delete`
- Select "Cached images and files"
- Clear for "All time"

**Or Hard Refresh:**
- Windows: `Ctrl + F5` or `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

### Step 4: Verify Files Are Gone
```bash
# On NAS, check if static folder still exists
ls -la /volume1/docker/nas-player/static/

# Should show empty or missing files
```

### Step 5: Check What Flask Returns
After rebuild, accessing `http://192.168.50.213:1699` should show:
- **404 error** or **empty page** (since `index.html` is deleted)
- This confirms old files are gone!

## Alternative: Quick Test - Check Container

```bash
# On NAS, check what's inside the container
docker exec nas-player ls -la /app/static/

# If files exist here but not in repo, that's the problem
# Rebuild fixes it
```

## Why This Happened

1. **Files deleted from Git repo** ✅ (local Windows machine)
2. **Files still in Docker image** ❌ (built before deletion)
3. **Browser cached old files** ❌ (cached `index.html`, `app.js`, `styles.css`)

## Prevention

When making UI changes:
1. Always rebuild Docker after changes: `docker-compose up -d --build`
2. Use hard refresh in browser: `Ctrl + Shift + R`
3. Check container files: `docker exec nas-player ls /app/static/`

## Next Steps

After clearing the cache and rebuilding, you should see:
- ✅ 404 error on `/` (no `index.html`)
- ✅ No UI showing (as expected)

Then you can:
1. Choose your UI framework from `UI_FRAMEWORK_OPTIONS.md`
2. I'll implement it fresh
3. Rebuild and it will work!

