#!/bin/bash
# Auto-deployment script for DS1621+
# This script pulls latest code from GitHub and restarts the service

set -e  # Exit on error

# Configuration - UPDATE THESE VALUES
GIT_REPO_URL="https://github.com/sbpang/NAS_MediaCenter.git"
DEPLOY_DIR="/volume1/docker/nas-player"
BRANCH="main"  # or "master" depending on your default branch

# If using Docker, set to true
USE_DOCKER=${USE_DOCKER:-true}

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting deployment...${NC}"

# Navigate to deployment directory
cd "$DEPLOY_DIR"

# Check if it's a git repository
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}Not a git repository. Cloning...${NC}"
    git clone "$GIT_REPO_URL" .
else
    echo -e "${GREEN}Pulling latest changes...${NC}"
    git fetch origin
    git reset --hard origin/$BRANCH
    git pull origin $BRANCH
fi

# Install/update dependencies
echo -e "${YELLOW}Updating dependencies...${NC}"
pip3 install --user -r requirements.txt

# Restart Docker container (if using Docker)
if [ "$USE_DOCKER" = "true" ] && [ -f "docker-compose.yml" ]; then
    echo -e "${YELLOW}Restarting Docker containers...${NC}"
    cd "$DEPLOY_DIR"
    docker-compose restart nas-player || docker-compose up -d --build
    echo -e "${GREEN}Docker containers restarted${NC}"
elif [ "$USE_DOCKER" = "true" ] && [ -f "docker-compose.webhook.yml" ]; then
    echo -e "${YELLOW}Restarting Docker containers (with webhook)...${NC}"
    cd "$DEPLOY_DIR"
    docker-compose -f docker-compose.webhook.yml restart nas-player || docker-compose -f docker-compose.webhook.yml up -d --build nas-player
    echo -e "${GREEN}Docker containers restarted${NC}"
else
    # If not using Docker, restart the service directly
    echo -e "${YELLOW}Restarting service...${NC}"
    # Kill existing process if running
    pkill -f "python.*app.py" || true
    # Start new process in background (or use systemd service)
    nohup python3 app.py > /dev/null 2>&1 &
    echo -e "${GREEN}Service restarted${NC}"
fi

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}Your NAS Media Player is now running the latest version.${NC}"

