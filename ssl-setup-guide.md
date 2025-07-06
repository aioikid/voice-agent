# 🌐 ドメイン設定とSSL証明書セットアップガイド

## 📋 前提条件
✅ ドメインを取得済み  
✅ ConoHa VPS稼働中 (IP: 160.251.140.29)  
✅ アプリケーションが正常に動作中  

## 🔧 1. DNS設定

### ドメインレジストラでの設定
お使いのドメインレジストラ（お名前.com、ムームードメイン等）で以下のDNSレコードを設定してください：

```
タイプ: A
名前: @ (または空欄)
値: 160.251.140.29
TTL: 3600

タイプ: A  
名前: www
値: 160.251.140.29
TTL: 3600
```

### DNS設定確認
```bash
# DNS設定が反映されているか確認
nslookup your-domain.com
nslookup www.your-domain.com

# または
dig your-domain.com
dig www.your-domain.com
```

## 🔒 2. Let's Encrypt SSL証明書の取得

### Certbotのインストール
```bash
# Snapdをインストール（Ubuntu 24.04では通常プリインストール済み）
apt update
apt install -y snapd

# Certbotをインストール
snap install --classic certbot

# certbotコマンドへのシンボリックリンクを作成
ln -s /snap/bin/certbot /usr/bin/certbot
```

### SSL証明書の取得
```bash
# 一時的にNginxを停止（ポート80を空ける）
/usr/local/bin/docker-compose stop nginx

# SSL証明書を取得（your-domain.comを実際のドメインに置き換え）
certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# 証明書取得後の確認
ls -la /etc/letsencrypt/live/your-domain.com/
```

### 証明書ファイルをプロジェクトにコピー
```bash
# SSLディレクトリを作成
mkdir -p /opt/voice-agent/ssl

# 証明書ファイルをコピー
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/voice-agent/ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/voice-agent/ssl/key.pem

# 権限設定
chmod 644 /opt/voice-agent/ssl/cert.pem
chmod 600 /opt/voice-agent/ssl/key.pem
```

## 🌐 3. Nginx設定の更新

### HTTPS対応のnginx.confを作成
```bash
cat > /opt/voice-agent/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream voice_agent {
        server voice-agent:8000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    # HTTP server (リダイレクト用)
    server {
        listen 80;
        server_name your-domain.com www.your-domain.com;
        
        # HTTPからHTTPSへリダイレクト
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name your-domain.com www.your-domain.com;

        # SSL設定
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        
        # SSL設定の最適化
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # セキュリティヘッダー
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options DENY always;
        add_header X-Content-Type-Options nosniff always;
        add_header X-XSS-Protection "1; mode=block" always;

        location / {
            proxy_pass http://voice_agent;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            
            # タイムアウト設定
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # API rate limiting
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

**重要**: 上記の `your-domain.com` を実際のドメイン名に置き換えてください。

## 🔄 4. Docker Composeの再起動

```bash
# コンテナを再起動
cd /opt/voice-agent
/usr/local/bin/docker-compose restart nginx

# ログを確認
/usr/local/bin/docker-compose logs nginx
```

## 🔥 5. ファイアウォール設定の確認

```bash
# HTTPS用ポート443が開いていることを確認
ufw status

# 必要に応じて443ポートを開放
ufw allow 443/tcp
```

## 🧪 6. SSL証明書の動作確認

### ブラウザでのテスト
以下のURLにアクセスして確認：
- `https://your-domain.com`
- `http://your-domain.com` (HTTPSにリダイレクトされることを確認)

### コマンドラインでのテスト
```bash
# SSL証明書の確認
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# HTTPSアクセステスト
curl -I https://your-domain.com

# HTTPリダイレクトテスト
curl -I http://your-domain.com
```

## 🔄 7. SSL証明書の自動更新設定

### 更新スクリプトの作成
```bash
cat > /opt/ssl-renew.sh << 'EOF'
#!/bin/bash

# SSL証明書の更新
certbot renew --quiet

# 証明書が更新された場合、ファイルをコピー
if [ -f /etc/letsencrypt/live/your-domain.com/fullchain.pem ]; then
    cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/voice-agent/ssl/cert.pem
    cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/voice-agent/ssl/key.pem
    chmod 644 /opt/voice-agent/ssl/cert.pem
    chmod 600 /opt/voice-agent/ssl/key.pem
    
    # Nginxを再起動
    cd /opt/voice-agent
    /usr/local/bin/docker-compose restart nginx
    
    echo "SSL certificate renewed and nginx restarted"
fi
EOF

chmod +x /opt/ssl-renew.sh
```

### Cronジョブの設定
```bash
# 毎日午前2時に証明書更新をチェック
echo "0 2 * * * /opt/ssl-renew.sh" | crontab -

# 設定確認
crontab -l
```

## 🎯 8. 最終確認

### アプリケーションの動作確認
1. `https://your-domain.com` にアクセス
2. ブラウザのアドレスバーに🔒マークが表示されることを確認
3. 設定ボタンからLiveKit設定を行う
4. マイクアクセスが正常に許可されることを確認
5. 音声エージェントとの接続をテスト

### トラブルシューティング

#### DNS設定が反映されない場合
```bash
# DNS設定の確認
nslookup your-domain.com 8.8.8.8
```

#### SSL証明書取得に失敗する場合
```bash
# ポート80が空いているか確認
netstat -tlnp | grep :80

# ファイアウォール設定確認
ufw status

# Nginxが停止しているか確認
/usr/local/bin/docker-compose ps
```

#### Nginxが起動しない場合
```bash
# Nginxのログを確認
/usr/local/bin/docker-compose logs nginx

# 設定ファイルの構文チェック
/usr/local/bin/docker-compose exec nginx nginx -t
```

## 📱 9. 完了後のアクセス方法

SSL設定完了後：
- **メインURL**: `https://your-domain.com`
- **API**: `https://your-domain.com/docs`
- **ヘルスチェック**: `https://your-domain.com/health`

これで、HTTPS環境でマイクアクセスが正常に動作し、音声エージェントシステムが完全に機能するようになります！

## ⚠️ 重要な注意事項

1. **ドメイン名の置き換え**: 全ての `your-domain.com` を実際のドメイン名に置き換えてください
2. **DNS反映時間**: DNS設定の反映には最大24時間かかる場合があります
3. **証明書の有効期限**: Let's Encryptの証明書は90日間有効です（自動更新設定済み）
4. **セキュリティ**: 本番環境では追加のセキュリティ設定を検討してください