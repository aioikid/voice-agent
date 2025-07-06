# 🔒 SSL設定完了コマンド

## 📋 証明書選択後に実行するコマンド

### 1. 証明書ファイルをプロジェクトにコピー
```bash
# SSLディレクトリを作成
sudo mkdir -p /opt/voice-agent/ssl

# 証明書ファイルをコピー
sudo cp /etc/letsencrypt/live/talktune.biz/fullchain.pem /opt/voice-agent/ssl/cert.pem
sudo cp /etc/letsencrypt/live/talktune.biz/privkey.pem /opt/voice-agent/ssl/key.pem

# 権限設定
sudo chmod 644 /opt/voice-agent/ssl/cert.pem
sudo chmod 600 /opt/voice-agent/ssl/key.pem

# ファイル確認
ls -la /opt/voice-agent/ssl/
```

### 2. HTTPS対応のNginx設定を作成
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

    # HTTP server (リダイレクト用)
    server {
        listen 80;
        server_name talktune.biz www.talktune.biz;
        
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name talktune.biz www.talktune.biz;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options DENY always;
        add_header X-Content-Type-Options nosniff always;

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

### 3. Nginxコンテナを再起動
```bash
cd /opt/voice-agent
sudo docker-compose restart nginx

# ログ確認
sudo docker-compose logs nginx
```

### 4. HTTPS動作確認
```bash
# HTTPS接続テスト
curl https://talktune.biz/health

# HTTPリダイレクトテスト
curl -I http://talktune.biz

# SSL証明書確認
openssl s_client -connect talktune.biz:443 -servername talktune.biz
```

### 5. ブラウザでアクセス
以下のURLでアクセスしてください：
- **HTTPS**: `https://talktune.biz`
- **HTTP**: `http://talktune.biz` (HTTPSにリダイレクト)

## 🎯 完了後の確認事項

✅ ブラウザのアドレスバーに🔒マークが表示される  
✅ マイクアクセスが正常に許可される  
✅ 音声エージェントとの接続が可能  
✅ HTTPアクセスがHTTPSにリダイレクトされる  

## ⚠️ 重要な注意事項

1. **証明書の有効期限**: Let's Encryptの証明書は90日間有効
2. **自動更新**: 証明書の自動更新設定を後で行う
3. **セキュリティ**: HTTPS化により完全な音声機能が利用可能

---

**まず証明書選択（1または2）を行ってから、上記のコマンドを実行してください！**