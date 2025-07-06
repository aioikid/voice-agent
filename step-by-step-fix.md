# 🔧 ConoHa VPS デプロイメント修復 - ステップバイステップガイド

## 📍 現在の状況
❌ Docker Composeが正しくインストールされていない  
❌ SSL証明書ファイルが存在しない  
❌ 権限エラーが発生している  
❌ curlコマンドの互換性問題  

## 🚀 修復手順（順番に実行してください）

### ステップ 1: Docker Composeの再インストール

```bash
# 現在のdocker-composeを削除
sudo rm -f /usr/local/bin/docker-compose

# 最新版をダウンロードしてインストール
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 実行権限を付与
sudo chmod +x /usr/local/bin/docker-compose

# インストール確認
docker-compose --version
```

### ステップ 2: プロジェクトディレクトリの権限修正

```bash
# プロジェクトディレクトリに移動
cd /opt/voice-agent

# 現在のディレクトリ確認
pwd

# ファイル一覧確認
ls -la

# 権限を修正
sudo chown -R root:root /opt/voice-agent
sudo chmod -R 755 /opt/voice-agent
```

### ステップ 3: 一時的にHTTP-onlyで動作させる

SSL設定は後で行うため、まずHTTP-onlyで動作確認します：

```bash
# HTTP-only用のnginx.confを作成
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

### ステップ 4: 環境変数ファイルの確認

```bash
# .envファイルが存在するか確認
ls -la .env

# 存在しない場合は作成
if [ ! -f .env ]; then
    cp .env.example .env
    echo ".envファイルを作成しました。APIキーを設定してください。"
fi

# .envファイルの編集（実際のAPIキーを設定）
nano .env
```

### ステップ 5: Dockerコンテナのビルドと起動

```bash
# 既存のコンテナを停止・削除
sudo docker-compose down 2>/dev/null || echo "コンテナは停止済みです"

# イメージをビルド
sudo docker-compose build --no-cache

# バックグラウンドで起動
sudo docker-compose up -d

# 起動状況確認
sudo docker-compose ps
```

### ステップ 6: 動作確認

```bash
# コンテナのログ確認
sudo docker-compose logs -f voice-agent

# 別のターミナルで以下を実行：
# ローカル接続テスト
curl http://localhost:8000/health

# 外部接続テスト（ドメインがある場合）
curl http://talktune.biz/health
```

## 🔍 トラブルシューティング

### Docker Composeが見つからない場合
```bash
# パスを確認
which docker-compose
echo $PATH

# 手動でパスを追加
export PATH=$PATH:/usr/local/bin
```

### コンテナが起動しない場合
```bash
# 詳細なログを確認
sudo docker-compose logs

# 個別のサービスログを確認
sudo docker-compose logs voice-agent
sudo docker-compose logs nginx
```

### ポートが使用中の場合
```bash
# ポート使用状況確認
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :8000

# 必要に応じてプロセスを停止
sudo pkill -f nginx
```

## ✅ 成功の確認方法

以下がすべて成功すれば、基本的なセットアップは完了です：

1. `docker-compose --version` でバージョンが表示される
2. `sudo docker-compose ps` でコンテナが "Up" 状態
3. `curl http://localhost:8000/health` で正常なレスポンス
4. ブラウザで `http://your-domain.com` または `http://your-ip:8000` にアクセス可能

## 🔒 次のステップ: SSL設定（オプション）

基本動作が確認できたら、SSL証明書を設定してHTTPS化します：

```bash
# Certbotをインストール
sudo apt update
sudo apt install -y certbot

# 一時的にNginxを停止
sudo docker-compose stop nginx

# SSL証明書を取得（ドメイン名を実際のものに置き換え）
sudo certbot certonly --standalone -d talktune.biz -d www.talktune.biz

# 証明書ファイルをコピー
sudo mkdir -p /opt/voice-agent/ssl
sudo cp /etc/letsencrypt/live/talktune.biz/fullchain.pem /opt/voice-agent/ssl/cert.pem
sudo cp /etc/letsencrypt/live/talktune.biz/privkey.pem /opt/voice-agent/ssl/key.pem
sudo chmod 644 /opt/voice-agent/ssl/cert.pem
sudo chmod 600 /opt/voice-agent/ssl/key.pem

# HTTPS対応のnginx.confに更新
# （別途提供するHTTPS設定ファイルを使用）

# Nginxを再起動
sudo docker-compose start nginx
```

---

## 📋 実行チェックリスト

- [ ] ステップ1: Docker Compose再インストール
- [ ] ステップ2: 権限修正
- [ ] ステップ3: HTTP-only nginx.conf作成
- [ ] ステップ4: .envファイル確認・編集
- [ ] ステップ5: Docker起動
- [ ] ステップ6: 動作確認

**まずはステップ1から順番に実行してください。各ステップの結果を教えていただければ、次のステップをサポートします。**