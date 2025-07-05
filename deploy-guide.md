# 🚀 ConoHa VPS Docker Deployment Guide

## 📋 前提条件

- ConoHa VPSアカウント
- Ubuntu 20.04 LTS以上のVPS
- ドメイン名（オプション）
- LiveKit APIキー
- OpenAI APIキー

## 🔧 VPSセットアップ

### 1. VPSに接続

```bash
ssh root@your-vps-ip
```

### 2. システム更新とDocker インストール

```bash
# システム更新
apt update && apt upgrade -y

# 必要なパッケージをインストール
apt install -y curl wget git unzip

# Dockerをインストール
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Docker Composeをインストール
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Dockerサービスを開始
systemctl start docker
systemctl enable docker
```

### 3. プロジェクトファイルをアップロード

#### 方法A: Gitを使用（推奨）

```bash
# プロジェクトディレクトリを作成
mkdir -p /opt/voice-agent
cd /opt/voice-agent

# このプロジェクトをクローン（またはファイルをアップロード）
# git clone your-repository-url .
```

#### 方法B: 手動でファイルをアップロード

SCPやFTPを使用してプロジェクトファイルをVPSにアップロードしてください。

### 4. 環境変数設定

```bash
cd /opt/voice-agent

# .envファイルを作成
cp .env.example .env
nano .env
```

`.env`ファイルを編集：

```env
# LiveKit Configuration
LIVEKIT_API_KEY=your_livekit_api_key_here
LIVEKIT_API_SECRET=your_livekit_api_secret_here
LIVEKIT_URL=wss://your-livekit-server.com

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Room configuration
DEFAULT_ROOM_NAME=talktune
```

### 5. ファイアウォール設定

```bash
# UFWを有効化
ufw enable

# 必要なポートを開放
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw allow 8000  # アプリケーション（開発用）

# 設定確認
ufw status
```

## 🐳 Docker デプロイ

### 1. アプリケーションをビルド・起動

```bash
cd /opt/voice-agent

# Dockerイメージをビルド
/usr/local/bin/docker-compose build

# コンテナを起動
/usr/local/bin/docker-compose up -d

# ログを確認
/usr/local/bin/docker-compose logs -f
```

### 2. 動作確認

```bash
# コンテナの状態確認
/usr/local/bin/docker-compose ps

# ヘルスチェック
curl http://localhost:8000/health

# エージェントの状態確認
curl http://localhost:8000/agent/status
```

## 🌐 ドメイン設定（オプション）

### 1. DNS設定

ドメインのAレコードをVPSのIPアドレスに設定してください。

### 2. SSL証明書（Let's Encrypt）

```bash
# Certbotをインストール
apt install -y certbot

# SSL証明書を取得
certbot certonly --standalone -d your-domain.com

# 証明書をNginx用にコピー
mkdir -p /opt/voice-agent/ssl
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/voice-agent/ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/voice-agent/ssl/key.pem

# nginx.confでHTTPS設定を有効化
nano /opt/voice-agent/nginx.conf
```

### 3. Nginxコンテナを再起動

```bash
cd /opt/voice-agent
/usr/local/bin/docker-compose restart nginx
```

## 📊 監視とメンテナンス

### 1. ログ監視

```bash
# リアルタイムログ
/usr/local/bin/docker-compose logs -f voice-agent

# エージェントログのみ
/usr/local/bin/docker-compose logs -f voice-agent | grep agent
```

### 2. 自動再起動設定

```bash
# Systemdサービスファイルを作成
cat > /etc/systemd/system/voice-agent.service << EOF
[Unit]
Description=Voice Agent Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/voice-agent
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# サービスを有効化
systemctl enable voice-agent.service
systemctl start voice-agent.service
```

### 3. 定期バックアップ

```bash
# バックアップスクリプトを作成
cat > /opt/backup-voice-agent.sh << EOF
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"
mkdir -p $BACKUP_DIR

# 設定ファイルをバックアップ
tar -czf $BACKUP_DIR/voice-agent-config-$DATE.tar.gz /opt/voice-agent/.env /opt/voice-agent/nginx.conf

# 古いバックアップを削除（30日以上）
find $BACKUP_DIR -name "voice-agent-config-*.tar.gz" -mtime +30 -delete
EOF

chmod +x /opt/backup-voice-agent.sh

# Cronジョブに追加（毎日午前2時）
echo "0 2 * * * /opt/backup-voice-agent.sh" | crontab -
```

## 🔧 トラブルシューティング

### 1. コンテナが起動しない

```bash
# ログを確認
/usr/local/bin/docker-compose logs voice-agent

# コンテナの状態確認
docker ps -a

# 手動でコンテナを起動してデバッグ
docker run -it --rm voice-agent_voice-agent /bin/bash
```

### 2. エージェントが接続できない

```bash
# 環境変数を確認
/usr/local/bin/docker-compose exec voice-agent env | grep LIVEKIT
/usr/local/bin/docker-compose exec voice-agent env | grep OPENAI

# エージェントを手動で再起動
curl -X POST http://localhost:8000/agent/restart
```

### 3. フロントエンドにアクセスできない

```bash
# Nginxの設定を確認
/usr/local/bin/docker-compose logs nginx

# ポートが開いているか確認
netstat -tlnp | grep :80
netstat -tlnp | grep :443
```

## 📱 アクセス方法

デプロイ完了後、以下のURLでアクセスできます：

- **HTTP**: `http://your-vps-ip:8000` または `http://your-domain.com`
- **HTTPS**: `https://your-domain.com` （SSL設定済みの場合）
- **API**: `http://your-domain.com/docs` （FastAPI Swagger UI）

## 🔄 更新手順

```bash
cd /opt/voice-agent

# 最新のコードを取得
git pull

# コンテナを再ビルド・再起動
/usr/local/bin/docker-compose down
/usr/local/bin/docker-compose build --no-cache
/usr/local/bin/docker-compose up -d

# 動作確認
curl http://localhost:8000/health
```

これで、ConoHa VPS上でLiveKit Voice Agentが本格運用できます！