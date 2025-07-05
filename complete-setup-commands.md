# 🚀 ConoHa VPS 完全セットアップ - 残りのファイル作成

## 📍 現在の状況確認
✅ `/opt/voice-agent` ディレクトリ  
✅ `docker-compose.yml` 作成済み  
✅ `.env` ファイル作成済み  

## 📁 1. 残りの必要ファイルを作成

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

### Python Agent作成
```bash
cat > agent.py << 'EOF'
"""
LiveKit Voice Agent with OpenAI Whisper STT and OpenAI TTS
"""

from dotenv import load_dotenv
import os
import asyncio
from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.plugins import openai, noise_cancellation, silero

load_dotenv()

class VoiceAssistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="You are a helpful voice AI assistant. Respond naturally and conversationally. Keep responses concise but informative. Always respond in Japanese when the user speaks Japanese, and in English when they speak English."
        )

async def entrypoint(ctx: agents.JobContext):
    """
    Main entry point for the voice agent using OpenAI Whisper for STT and OpenAI TTS
    """
    turn_detection = None
    try:
        from livekit.plugins.turn_detector.multilingual import MultilingualModel
        turn_detection = MultilingualModel()
        print("Turn detection enabled")
    except Exception as e:
        print(f"Warning: Turn detection not available: {e}")
    
    session = AgentSession(
        stt=openai.STT(
            model="whisper-1",
            language="auto"
        ),
        
        llm=openai.LLM(
            model="gpt-4o-mini",
            temperature=0.7
        ),
        
        tts=openai.TTS(
            model="tts-1",
            voice="alloy"
        ),
        
        vad=silero.VAD.load(),
        turn_detection=turn_detection,
    )

    await session.start(
        room=ctx.room,
        agent=VoiceAssistant(),
        room_input_options=RoomInputOptions(
            noise_cancellation=noise_cancellation.BVC(),
        ),
    )

    await ctx.connect()
    
    print("Agent connected to room, waiting for participants...")
    
    await asyncio.sleep(2)
    
    try:
        await session.generate_reply(
            instructions="Say exactly this in Japanese: 'こんにちは！音声AIアシスタントです。接続テストが成功しました。何かお手伝いできることはありますか？'"
        )
        print("Initial greeting sent")
    except Exception as e:
        print(f"Failed to send initial greeting: {e}")

if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
EOF
```

### Server.py作成
```bash
cat > server.py << 'EOF'
"""
Combined server for serving the frontend and managing the voice agent
"""
import asyncio
import os
import subprocess
import threading
import time
from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="LiveKit Voice Agent Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

agent_process = None
agent_status = {"running": False, "last_started": None, "error": None}

def start_agent():
    global agent_process, agent_status
    
    try:
        if agent_process and agent_process.poll() is None:
            agent_process.terminate()
            agent_process.wait(timeout=10)
    except:
        pass
    
    try:
        agent_process = subprocess.Popen(
            ["python", "agent.py", "dev"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        agent_status["running"] = True
        agent_status["last_started"] = time.time()
        agent_status["error"] = None
        
        print(f"Voice agent started with PID: {agent_process.pid}")
        
    except Exception as e:
        agent_status["running"] = False
        agent_status["error"] = str(e)
        print(f"Failed to start voice agent: {e}")

def monitor_agent():
    global agent_process, agent_status
    
    while True:
        try:
            if agent_process and agent_process.poll() is not None:
                agent_status["running"] = False
                print("Voice agent process died, restarting...")
                start_agent()
            
            time.sleep(30)
            
        except Exception as e:
            print(f"Error in agent monitor: {e}")
            time.sleep(60)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "agent_running": agent_status["running"],
        "timestamp": time.time()
    }

@app.get("/agent/status")
async def get_agent_status():
    global agent_process
    
    is_running = agent_process and agent_process.poll() is None
    agent_status["running"] = is_running
    
    return {
        "running": is_running,
        "last_started": agent_status["last_started"],
        "error": agent_status["error"],
        "pid": agent_process.pid if agent_process else None
    }

@app.post("/agent/restart")
async def restart_agent():
    try:
        start_agent()
        return {"message": "Agent restart initiated", "status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to restart agent: {str(e)}")

public_dir = Path("public")
if public_dir.exists():
    app.mount("/static", StaticFiles(directory="public"), name="static")
    
    @app.get("/")
    async def serve_frontend():
        return FileResponse("public/index.html")
    
    @app.get("/{path:path}")
    async def serve_frontend_routes(path: str):
        file_path = public_dir / path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        else:
            return FileResponse("public/index.html")

def main():
    if not os.path.exists(".env"):
        print("Warning: .env file not found. Please create one based on .env.example")
    
    monitor_thread = threading.Thread(target=monitor_agent, daemon=True)
    monitor_thread.start()
    
    start_agent()
    
    print("Starting LiveKit Voice Agent Server...")
    print("Frontend will be available at: http://localhost:8000")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )

if __name__ == "__main__":
    main()
EOF
```

### Nginx設定
```bash
cat > nginx.conf << 'EOF'
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

### Frontend package.json
```bash
cat > package.json << 'EOF'
{
  "name": "voice-agent-frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@livekit/components-core": "^0.12.8",
    "@livekit/components-react": "^2.9.13",
    "@livekit/components-styles": "^1.1.6",
    "livekit-client": "^2.15.2",
    "lucide-react": "^0.344.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.5.3",
    "vite": "^5.4.2"
  }
}
EOF
```

### .env.example作成
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
```

## 🔑 2. 環境変数設定（重要！）

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

## 🔥 3. ファイアウォール設定

```bash
# UFWファイアウォールを設定
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8000/tcp
ufw status
```

## 📁 4. ファイル確認

```bash
# 作成されたファイルを確認
ls -la
```

## 🚀 5. Docker Compose でビルド・起動

```bash
# Dockerイメージをビルド
docker-compose build

# バックグラウンドで起動
docker-compose up -d

# ログを確認
docker-compose logs -f
```

## 🔍 6. 動作確認

```bash
# コンテナ状態確認
docker-compose ps

# ヘルスチェック
curl http://localhost:8000/health

# 外部からのアクセステスト
curl http://160.251.140.29:8000/health
```

## 🌐 7. ブラウザでアクセス

以下のURLでWebアプリケーションにアクセス：
- **HTTP**: `http://160.251.140.29:8000`

---

## ⚠️ 重要な注意事項

1. **APIキー設定**: `.env`ファイルに実際のAPIキーを設定するまでエージェントは動作しません
2. **LiveKit APIキー**: [LiveKit Cloud](https://cloud.livekit.io/) で取得
3. **OpenAI APIキー**: [OpenAI Platform](https://platform.openai.com/) で取得

## 🔧 トラブルシューティング

### ログ確認
```bash
# 全体のログ
docker-compose logs

# エージェントのログのみ
docker-compose logs voice-agent

# リアルタイムログ
docker-compose logs -f voice-agent
```

### 再起動
```bash
# サービス再起動
docker-compose restart

# 完全リビルド
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### 環境変数確認
```bash
docker-compose exec voice-agent env | grep LIVEKIT
docker-compose exec voice-agent env | grep OPENAI
```

---

## 📋 実行順序

1. 上記のファイル作成コマンドをすべて実行
2. `.env`ファイルに実際のAPIキーを設定
3. ファイアウォール設定
4. `docker-compose build && docker-compose up -d`
5. ブラウザで `http://160.251.140.29:8000` にアクセス

**準備ができたら実行してください！**