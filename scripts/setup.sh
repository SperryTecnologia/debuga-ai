#!/usr/bin/env bash
# ============================================================
# debuga.ai - Server Setup Script
# Prepares a fresh Ubuntu 22.04/24.04 server with all dependencies.
# Run as root or with sudo.
# ============================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[SETUP]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── Check root ──
[[ $EUID -eq 0 ]] || err "This script must be run as root (sudo ./scripts/setup.sh)"

log "Starting debuga.ai server setup..."

# ── System updates ──
log "Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq

# ── Essential packages ──
log "Installing essential packages..."
apt-get install -y -qq \
  curl wget git unzip htop net-tools \
  ca-certificates gnupg lsb-release \
  ufw fail2ban certbot

# ── Docker ──
if ! command -v docker &>/dev/null; then
  log "Installing Docker..."
  curl -fsSL https://get.docker.com | bash
  systemctl enable docker
  systemctl start docker
else
  log "Docker already installed: $(docker --version)"
fi

# ── Docker Compose (plugin) ──
if ! docker compose version &>/dev/null; then
  log "Installing Docker Compose plugin..."
  apt-get install -y -qq docker-compose-plugin
else
  log "Docker Compose already installed: $(docker compose version)"
fi

# ── NVIDIA Container Toolkit (optional) ──
if lspci 2>/dev/null | grep -qi nvidia; then
  log "NVIDIA GPU detected. Installing NVIDIA Container Toolkit..."
  if ! command -v nvidia-smi &>/dev/null; then
    warn "NVIDIA drivers not found. Install drivers first:"
    warn "  sudo apt install nvidia-driver-535"
    warn "  sudo reboot"
  else
    log "NVIDIA driver: $(nvidia-smi --query-gpu=driver_version --format=csv,noheader | head -1)"
    # Install nvidia-container-toolkit
    if ! dpkg -l | grep -q nvidia-container-toolkit; then
      curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
        gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
      curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
        sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
        tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
      apt-get update -qq
      apt-get install -y -qq nvidia-container-toolkit
      nvidia-ctk runtime configure --runtime=docker
      systemctl restart docker
      log "NVIDIA Container Toolkit installed."
    else
      log "NVIDIA Container Toolkit already installed."
    fi
  fi
else
  warn "No NVIDIA GPU detected. Ollama will run on CPU (slower inference)."
fi

# ── Firewall ──
log "Configuring UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
log "Firewall configured: SSH, HTTP, HTTPS allowed."

# ── Fail2ban ──
log "Configuring fail2ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
EOF
systemctl enable fail2ban
systemctl restart fail2ban

# ── Create app user ──
if ! id debuga &>/dev/null; then
  log "Creating debuga user..."
  useradd -m -s /bin/bash -G docker debuga
  log "User 'debuga' created and added to docker group."
else
  log "User 'debuga' already exists."
  usermod -aG docker debuga 2>/dev/null || true
fi

# ── Create directories ──
log "Creating project directories..."
mkdir -p /opt/debuga-ai/backups
chown -R debuga:debuga /opt/debuga-ai

# ── Summary ──
echo ""
log "========================================="
log "  Server setup complete!"
log "========================================="
log ""
log "Next steps:"
log "  1. Copy the debuga-ai package to /opt/debuga-ai/"
log "  2. Create .env from .env.example"
log "  3. Run: ./scripts/install.sh"
log "  4. Run: ./scripts/deploy.sh"
log ""
if lspci 2>/dev/null | grep -qi nvidia; then
  log "  GPU detected: use docker-compose.gpu.yml overlay"
fi
