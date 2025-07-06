# 🔒 SSL証明書設定完了ガイド

## 📍 現在の状況
✅ SSL証明書が既に取得済み (`talktune.biz`)  
✅ ConoHa VPS稼働中  
✅ アプリケーションがHTTPで動作中  
🔄 **次のステップ**: SSL証明書をプロジェクトに適用してHTTPS化  

## 🚀 手順1: SSL証明書ファイルをプロジェクトにコピー

### 1-1. SSLディレクトリを作成
```bash
sudo mkdir -p /opt/voice-agent/ssl
```

### 1-2. 証明書ファイルをコピー
```bash
# 証明書ファイルをプロジェクトディレクトリにコピー
sudo cp /etc/letsencrypt/live/talktune.biz/fullchain.pem /opt/voice-agent/ssl/cert.pem
sudo cp /etc/letsencrypt/live/talktune.biz/privkey.pem /opt/voice-agent/ssl/key.pem
```

### 1-3. ファイル権限を設定
```bash
# 証明書ファイルの権限を適切に設定
sudo chmod 644 /opt/voice-agent/ssl/cert.pem
sudo chmod 600 /opt/voice-agent/ssl/key.pem
```

### 1-4. ファイルが正しくコピーされたか確認
```bash
# ファイル一覧を確認
ls -la /opt/voice-agent/ssl/
```

**期待される出力:**
```
total 16
drwxr-xr-x 2 root root 4096 Jan 15 10:30 .
drwxr-xr-x 8 root root 4096 Jan 15 10:25 ..
-rw-r--r-- 1 root root 3456 Jan 15 10:30 cert.pem
-rw------- 1 root root 1704 Jan 15 10:30 key.pem
```

---

## 🌐 手順2: Nginx設定をHTTPS対応に更新

### 2-1. 現在のnginx.confをバックアップ
```bash
# 現在の設定をバックアップ
sudo cp /opt/voice-agent/nginx.conf /opt/voice-agent/nginx.conf.backup
```

### 2-2. HTTPS対応のnginx.confを作成
```bash
# HTTPS対応の新しい設定ファイルを作成
sudo cat > /opt/voice-agent/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream voice_agent {
        server voice-agent:8000;
    }

    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    # HTTP server (HTTPSへのリダイレクト用)
    server {
        listen 80;
        server_name talktune.biz www.talktune.biz;
        
        # すべてのHTTPアクセスをHTTPSにリダイレクト
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server (メインサーバー)
    server {
        listen 443 ssl http2;
        server_name talktune.biz www.talktune.biz;

        # SSL証明書の設定
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        
        # SSL設定の最適化
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # セキュリティヘッダー
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options DENY always;
        add_header X-Content-Type-Options nosniff always;

        # アプリケーションへのプロキシ設定
        location / {
            proxy_pass http://voice_agent;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket対応
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }

        # API用の設定（レート制限付き）
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

---

## 🔄 手順3: Nginxコンテナを再起動

### 3-1. プロジェクトディレクトリに移動
```bash
cd /opt/voice-agent
```

### 3-2. Nginxコンテナを再起動
```bash
# Nginxコンテナのみを再起動
sudo docker-compose restart nginx
```

### 3-3. 再起動状況を確認
```bash
# コンテナの状態を確認
sudo docker-compose ps
```

**期待される出力:**
```
NAME                    COMMAND                  SERVICE             STATUS              PORTS
voice-agent-nginx-1     "/docker-entrypoint.…"   nginx               Up 5 seconds        0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
voice-agent-voice-agent-1   "python server.py"       voice-agent         Up 10 minutes       0.0.0.0:8000->8000/tcp, 0.0.0.0:8080->8080/tcp
```

### 3-4. Nginxのログを確認
```bash
# Nginxのログを確認（エラーがないかチェック）
sudo docker-compose logs nginx
```

---

## ✅ 手順4: HTTPS動作確認

### 4-1. ローカルでのHTTPS接続テスト
```bash
# HTTPS接続テスト
curl -I https://talktune.biz/health
```

**期待される出力:**
```
HTTP/2 200 
server: nginx/1.25.3
date: Mon, 15 Jan 2024 10:35:00 GMT
content-type: application/json
content-length: 85
```

### 4-2. HTTPリダイレクトテスト
```bash
# HTTPアクセスがHTTPSにリダイレクトされるかテスト
curl -I http://talktune.biz
```

**期待される出力:**
```
HTTP/1.1 301 Moved Permanently
server: nginx/1.25.3
location: https://talktune.biz/
```

### 4-3. SSL証明書の詳細確認
```bash
# SSL証明書の詳細を確認
  
```

---

## 🌐 手順5: ブラウザでの最終確認

### 5-1. ブラウザでアクセス
以下のURLにアクセスしてください：

1. **HTTPS**: `https://talktune.biz`
2. **HTTP**: `http://talktune.biz` (自動的にHTTPSにリダイレクト)

### 5-2. 確認ポイント
- [ ] ブラウザのアドレスバーに🔒マークが表示される
- [ ] 「接続は保護されています」と表示される
- [ ] HTTPアクセスが自動的にHTTPSにリダイレクトされる
- [ ] マイクアクセス許可のダイアログが正常に表示される
- [ ] 音声エージェントとの接続が可能

---

## 🎯 完了後の状態

### ✅ 成功した場合
- **URL**: `https://talktune.biz` でアクセス可能
- **セキュリティ**: SSL/TLS暗号化により安全な通信
- **マイクアクセス**: ブラウザでマイクアクセスが正常に動作
- **自動リダイレクト**: HTTPアクセスは自動的にHTTPSにリダイレクト

### 🔧 トラブルシューティング

#### 問題1: Nginxが起動しない
```bash
# Nginxのログを詳細確認
sudo docker-compose logs nginx

# 設定ファイルの構文チェック
sudo docker-compose exec nginx nginx -t
```

#### 問題2: SSL証明書エラー
```bash
# 証明書ファイルの存在確認
ls -la /opt/voice-agent/ssl/

# 証明書の内容確認
sudo openssl x509 -in /opt/voice-agent/ssl/cert.pem -text -noout
```

#### 問題3: HTTPSアクセスできない
```bash
# ファイアウォール確認
sudo ufw status

# ポート443が開いているか確認
sudo netstat -tlnp | grep :443
```

---

## 📋 実行チェックリスト

実行前に以下をチェックしてください：

- [ ] **手順1**: SSL証明書ファイルをコピー
- [ ] **手順2**: nginx.confをHTTPS対応に更新  
- [ ] **手順3**: Nginxコンテナを再起動
- [ ] **手順4**: HTTPS動作確認
- [ ] **手順5**: ブラウザでの最終確認

---

## 🚨 重要な注意事項

1. **証明書の有効期限**: Let's Encryptの証明書は90日間有効
2. **自動更新**: 後で証明書の自動更新設定を行う必要があります
3. **バックアップ**: 設定変更前に必ずバックアップを取ってください
4. **セキュリティ**: 本番環境では追加のセキュリティ設定を検討してください

---

**このガイドに従って手順を実行すれば、HTTPS化が完了し、マイクアクセスが正常に動作するようになります！**