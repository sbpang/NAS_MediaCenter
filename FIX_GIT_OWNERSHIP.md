# Fix Git Ownership Issue on DS1621+

If you see the error: `fatal: detected dubious ownership in repository`, follow these steps:

## Quick Fix (Run on NAS via SSH)

```bash
cd /volume1/docker/nas-player

# Add the directory to Git's safe directories
git config --global --add safe.directory /volume1/docker/nas-player

# Verify it works
git fetch origin
git status
```

## Why This Happens

Git has security checks to prevent running commands in repositories owned by different users. On Synology NAS:
- Files might be owned by `admin` or `root`
- You might be running commands as a different user
- Docker containers run as different users

## Permanent Fix Options

### Option 1: Fix Ownership (Recommended)

```bash
cd /volume1/docker/nas-player

# Check current ownership
ls -la | head -5

# Fix ownership to match your user
sudo chown -R admin:users /volume1/docker/nas-player
# Replace 'admin' with your actual username

# Verify
ls -la | head -5
```

### Option 2: Add to Safe Directories (Already in deploy.sh)

The deploy script now automatically adds the directory to Git's safe directories. But you can also do it manually:

```bash
# Add global safe directory
git config --global --add safe.directory /volume1/docker/nas-player

# Or for all users (system-wide)
sudo git config --system --add safe.directory /volume1/docker/nas-player
```

### Option 3: Fix for Docker Container

If the issue happens inside the Docker container:

```bash
# Edit docker-compose.webhook.yml to add Git config
# Or run inside container:
docker exec nas-player-webhook git config --global --add safe.directory /app
```

## Verify Fix

```bash
cd /volume1/docker/nas-player

# These should work without errors:
git fetch origin
git pull origin main
git status
```

## Update Deploy Script

The deploy script (`deploy.sh`) has been updated to automatically fix this issue. After pulling the latest code:

```bash
cd /volume1/docker/nas-player
git pull origin main
# deploy.sh now includes the fix automatically
```

## Still Having Issues?

1. **Check user running git commands:**
   ```bash
   whoami
   ls -la /volume1/docker/nas-player/.git | head -3
   ```

2. **Check Git configuration:**
   ```bash
   git config --global --get-regexp safe.directory
   ```

3. **Use sudo if needed:**
   ```bash
   sudo git config --global --add safe.directory /volume1/docker/nas-player
   ```

