# 🐳 次のステップ: Docker インストールとプロジェクトセットアップ

## 📍 現在の状況
✅ システム更新完了  
✅ 基本パッケージインストール完了  
✅ SSH接続中: root@vm-7a18b952-dd  

## 🔧 1. Docker インストール

以下のコマンドを順番に実行してください：

```bash
# Dockerをインストール
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Docker Composeをインストール
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Dockerサービスを開始
systemctl start docker
systemctl enable docker

# インストール確認
docker --version
docker-compose --version
```

## 📁 2. プロジェクトディレクトリ作成

```bash
# プロジェクトディレクトリを作成
mkdir -p /opt/voice-agent
cd /opt/voice-agent

# 現在のディレクトリ確認
pwd
```

## 📝 3. プロジェクトファイル作成

### Docker Compose設定ファイル
```bash
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  voice-agent:
    build: .
    ports:
      - "8000:8000"
      - "8080:8080"
    environment:
      - LIVEKIT_API_KEY=${LIVEKIT_API_KEY}
      - LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET}
      - LIVEKIT_URL=${LIVEKIT_URL}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - DEFAULT_ROOM_NAME=${DEFAULT_ROOM_NAME:-talktune}
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - voice-agent
    restart: unless-stopped
EOF
```

### Dockerfile作成
```bash
cat > Dockerfile << 'EOF'
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY agent.py .
COPY .env.example .env.example

COPY --from=frontend-builder /app/frontend/dist ./public

RUN pip install fastapi uvicorn python-multipart

COPY server.py .

EXPOSE 8000 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["python", "server.py"]
EOF
```

### Python requirements.txt
```bash
cat > requirements.txt << 'EOF'
livekit-agents[openai,silero,turn-detector]~=1.0
livekit-plugins-noise-cancellation~=0.2
python-dotenv
uvicorn
fastapi
python-multipart
EOF
```

### 環境変数ファイル作成
```bash
cat > .env.example << 'EOF'
# LiveKit Configuration
LIVEKIT_API_KEY=your_livekit_api_key_here
LIVEKIT_API_SECRET=your_livekit_api_secret_here
LIVEKIT_URL=wss://your-livekit-server.com

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Room configuration
DEFAULT_ROOM_NAME=talktune
EOF

# 実際の.envファイルを作成
cp .env.example .env
```

## 🔑 4. 環境変数設定（重要！）

```bash
# .envファイルを編集
nano .env
```

**以下の内容に実際のAPIキーを設定してください：**

```env
# LiveKit Configuration
LIVEKIT_API_KEY=あなたの実際のLiveKitAPIキー
LIVEKIT_API_SECRET=あなたの実際のLiveKitシークレット
LIVEKIT_URL=wss://talktune-exng0106.livekit.cloud

# OpenAI Configuration
OPENAI_API_KEY=あなたの実際のOpenAIAPIキー

# Room configuration
DEFAULT_ROOM_NAME=talktune
```

### nanoエディタの操作方法
- 編集完了: `Ctrl + X`
- 保存確認: `Y`
- ファイル名確認: `Enter`

## 🔥 5. ファイアウォール設定

```bash
# UFWファイアウォールを設定
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8000/tcp
ufw status
```

---

## 📋 次回のメッセージで実行すること

1. 上記のDockerインストールコマンドを実行
2. プロジェクトファイルを作成
3. `.env`ファイルに実際のAPIキーを設定
4. ファイアウォール設定
5. `/usr/local/bin/docker-compose build && /usr/local/bin/docker-compose up -d` で起動

**重要**: `.env`ファイルに実際のAPIキーを設定するまでエージェントは動作しません！

準備ができたら、次のメッセージで実行結果を教えてください。