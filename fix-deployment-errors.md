# 🔧 Fix ConoHa VPS Deployment Errors

## 📋 Current Issues and Solutions

### 1. Fix Docker Compose Installation

The Docker Compose binary is missing. Let's reinstall it properly:

```bash
# Remove any existing docker-compose
sudo rm -f /usr/local/bin/docker-compose

# Download and install Docker Compose with proper permissions
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make it executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

### 2. Fix SSL Certificate Setup

The SSL certificates don't exist yet. Let's set them up properly:

```bash
# First, stop any running containers (if docker-compose is working)
cd /opt/voice-agent
sudo docker-compose stop nginx 2>/dev/null || echo "Nginx not running"

# Install certbot if not already installed
sudo apt update
sudo apt install -y certbot

# Obtain SSL certificate (replace talktune.biz with your actual domain)
sudo certbot certonly --standalone -d talktune.biz -d www.talktune.biz

# Create SSL directory with proper permissions
sudo mkdir -p /opt/voice-agent/ssl

# Copy certificate files
sudo cp /etc/letsencrypt/live/talktune.biz/fullchain.pem /opt/voice-agent/ssl/cert.pem
sudo cp /etc/letsencrypt/live/talktune.biz/privkey.pem /opt/voice-agent/ssl/key.pem

# Set proper permissions
sudo chmod 644 /opt/voice-agent/ssl/cert.pem
sudo chmod 600 /opt/voice-agent/ssl/key.pem

# Change ownership to allow Docker to read
sudo chown root:root /opt/voice-agent/ssl/*

# Verify files exist
ls -la /opt/voice-agent/ssl/
```

### 3. Fix Curl Command Issues

Replace `curl -I` with compatible alternatives:

```bash
# Instead of: curl -I http://talktune.biz
# Use one of these:

# Option 1: Basic connectivity test
curl http://talktune.biz

# Option 2: Get headers with verbose output
curl -v http://talktune.biz

# Option 3: Use wget for header information
wget --server-response --spider http://talktune.biz
```

### 4. Complete Docker Setup and Start

After fixing the above issues:

```bash
# Navigate to project directory
cd /opt/voice-agent

# Build and start containers
sudo docker-compose build
sudo docker-compose up -d

# Check container status
sudo docker-compose ps

# View logs
sudo docker-compose logs -f
```

### 5. Verify Everything is Working

```bash
# Check if containers are running
sudo docker-compose ps

# Test local connectivity
curl http://localhost:8000/health

# Test external connectivity (replace with your domain)
curl http://talktune.biz/health

# Check SSL certificate (if HTTPS is set up)
openssl s_client -connect talktune.biz:443 -servername talktune.biz
```

## 🔧 Alternative: Temporary HTTP-Only Setup

If SSL setup is causing issues, you can temporarily run without HTTPS:

### Create HTTP-only nginx.conf

```bash
sudo cat > /opt/voice-agent/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream voice_agent {
        server voice-agent:8000;
    }

    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    server {
        listen 80;
        server_name _;

        location / {
            proxy_pass http://voice_agent;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }

        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://voice_agent;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF
```

### Start with HTTP-only

```bash
cd /opt/voice-agent
sudo docker-compose restart nginx
sudo docker-compose logs nginx
```

## 📝 Step-by-Step Execution Order

Execute these commands in order:

1. **Fix Docker Compose**:
   ```bash
   sudo rm -f /usr/local/bin/docker-compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   docker-compose --version
   ```

2. **Set up SSL (optional, skip if you want HTTP-only)**:
   ```bash
   sudo apt install -y certbot
   sudo certbot certonly --standalone -d talktune.biz -d www.talktune.biz
   sudo mkdir -p /opt/voice-agent/ssl
   sudo cp /etc/letsencrypt/live/talktune.biz/fullchain.pem /opt/voice-agent/ssl/cert.pem
   sudo cp /etc/letsencrypt/live/talktune.biz/privkey.pem /opt/voice-agent/ssl/key.pem
   sudo chmod 644 /opt/voice-agent/ssl/cert.pem
   sudo chmod 600 /opt/voice-agent/ssl/key.pem
   ```

3. **Start the application**:
   ```bash
   cd /opt/voice-agent
   sudo docker-compose build
   sudo docker-compose up -d
   ```

4. **Verify it's working**:
   ```bash
   sudo docker-compose ps
   curl http://localhost:8000/health
   curl http://talktune.biz/health
   ```

## ⚠️ Important Notes

- Always use `sudo` for system-level operations
- Replace `talktune.biz` with your actual domain name
- If SSL setup fails, use the HTTP-only configuration temporarily
- Make sure your domain's DNS is pointing to your VPS IP address before running certbot
- The application will work with HTTP, but microphone access requires HTTPS in most browsers

After following these steps, your deployment should be working correctly!