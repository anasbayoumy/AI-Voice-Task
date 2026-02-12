# SSL Setup for internal2.clocklo.com

Step-by-step guide to get a free Let's Encrypt SSL certificate for your VPS.

---

## Prerequisites

Before starting, ensure:

1. **DNS is configured** — `internal2.clocklo.com` must point to your VPS IP
   ```bash
   # Verify from your machine
   nslookup internal2.clocklo.com
   # or
   dig internal2.clocklo.com +short
   ```
   You should see your VPS IP address.

2. **Port 80 is open** — Let's Encrypt needs it for validation
   ```bash
   # On VPS, check firewall allows HTTP
   sudo ufw status
   # If needed: sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw reload
   ```

3. **Your server is running** — Docker container on port 8080
   ```bash
   docker compose -f docker-compose.prod.yml ps
   curl http://localhost:8080/health
   ```

---

## Step 1: Install Nginx and Certbot

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Start Nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## Step 2: Create Nginx Configuration

Create the config file:

```bash
sudo nano /etc/nginx/sites-available/ai-voice-agent
```

Paste this configuration (includes WebSocket support for your voice agent):

```nginx
server {
    listen 80;
    server_name internal2.clocklo.com;

    # WebSocket support (required for voice agent)
    location /web {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # HTTP API and other routes
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

---

## Step 3: Enable the Site

```bash
# Create symlink to enable site
sudo ln -sf /etc/nginx/sites-available/ai-voice-agent /etc/nginx/sites-enabled/

# Remove default site (optional, prevents conflicts)
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Step 4: Obtain SSL Certificate

```bash
# Run Certbot - it will modify nginx config automatically
sudo certbot --nginx -d internal2.clocklo.com
```

**During the setup, Certbot will ask:**

1. **Email** — Enter your email for expiry notifications (recommended)
2. **Terms of Service** — Type `Y` to agree
3. **Share email** — Optional, type `N` if you prefer not to
4. **Redirect HTTP to HTTPS** — Type `2` (recommended) to redirect all HTTP to HTTPS

Certbot will:
- Obtain the certificate
- Modify your Nginx config to use HTTPS
- Set up auto-renewal

---

## Step 5: Verify Everything Works

```bash
# Check certificate
sudo certbot certificates

# Test HTTPS
curl https://internal2.clocklo.com/health

# Test from browser
# https://internal2.clocklo.com/health
```

---

## Step 6: Update Your Configuration

### Update .env on VPS

```bash
cd ~/ai-voice-task
nano .env
```

Change `SERVER_PUBLIC_URL`:

```env
SERVER_PUBLIC_URL=https://internal2.clocklo.com
```

Restart the server:

```bash
docker compose -f docker-compose.prod.yml up -d
```

### Update Client (if self-hosted)

If you serve the client from the same domain, update `VITE_API_URL`:

```env
VITE_API_URL=wss://internal2.clocklo.com
```

---

## Auto-Renewal

Certbot installs a cron job for auto-renewal. Verify it:

```bash
# Check renewal timer
sudo systemctl status certbot.timer

# Test renewal (dry run)
sudo certbot renew --dry-run
```

Certificates renew automatically every ~60 days.

---

## Final Nginx Config (After Certbot)

After Certbot runs, your config will look similar to:

```nginx
server {
    server_name internal2.clocklo.com;

    location /web {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen [::]:443 ssl;
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/internal2.clocklo.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/internal2.clocklo.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = internal2.clocklo.com) {
        return 301 https://$host$request_uri;
    }

    listen 80;
    listen [::]:80;
    server_name internal2.clocklo.com;
    return 404;
}
```

---

## Troubleshooting

### Certbot fails: "Connection refused" or "Timeout"

- Ensure your app is running: `docker compose -f docker-compose.prod.yml ps`
- Ensure port 80 is open: `sudo ufw allow 80`
- Check DNS: `dig internal2.clocklo.com` from outside your network

### Certbot: "Invalid response from ..." or DNS challenge needed

If your domain is internal-only or behind a firewall:

```bash
# Use DNS challenge instead (manual)
sudo certbot certonly --manual --preferred-challenges dns -d internal2.clocklo.com
# Follow prompts to add TXT record to your DNS
```

### WebSocket connection fails over HTTPS

- Ensure Nginx has `proxy_set_header Upgrade` and `Connection "upgrade"`
- Use `wss://` (not `ws://`) in client config: `wss://internal2.clocklo.com`

### Renewal fails

```bash
# Force renewal
sudo certbot renew --force-renewal

# Check logs
sudo journalctl -u certbot.timer
```

---

## Quick Reference

| Item | Value |
|------|-------|
| Domain | internal2.clocklo.com |
| Backend | http://127.0.0.1:8080 |
| Certificate | Let's Encrypt (auto-renew) |
| Cert path | /etc/letsencrypt/live/internal2.clocklo.com/ |
