# 🔧 サーバー側での手動ファイル作成

## 📍 現在の状況
❌ Gitリポジトリが初期化されていない  
✅ `/opt/voice-agent` ディレクトリは存在  
✅ Docker、Docker Composeはインストール済み  

## 🛠️ 手動でファイルを作成する手順

### 1. 必要なファイルを順番に作成

#### Dockerfile
```bash
cat > Dockerfile << 'EOF'
# Frontend build stage
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm install

# Copy all source files including index.html at root
COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig*.json ./
COPY postcss.config.js ./
COPY tailwind.config.js ./
COPY eslint.config.js ./
COPY src/ ./src/

# Build the frontend
RUN npm run build

# Python backend stage
FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Python requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Python files
COPY agent.py .
COPY server.py .
COPY .env.example .env.example

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/dist ./public

EXPOSE 8000 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["python", "server.py"]
EOF
```

#### requirements.txt
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

#### agent.py
```bash
cat > agent.py << 'EOF'
"""
LiveKit Voice Agent with OpenAI Whisper STT and OpenAI TTS
Modified from the original LiveKit documentation to use OpenAI for both STT and TTS
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
    # Try to import turn detector, but continue without it if models aren't available
    turn_detection = None
    try:
        from livekit.plugins.turn_detector.multilingual import MultilingualModel
        turn_detection = MultilingualModel()
        print("Turn detection enabled")
    except Exception as e:
        print(f"Warning: Turn detection not available: {e}")
        print("Agent will work without turn detection. To enable it, run: python agent.py download-files")
    
    session = AgentSession(
        # Use OpenAI Whisper for Speech-to-Text
        stt=openai.STT(
            model="whisper-1",
            language="auto"  # Auto-detect language
        ),
        
        # Use OpenAI for Language Model
        llm=openai.LLM(
            model="gpt-4o-mini",
            temperature=0.7
        ),
        
        # Use OpenAI TTS for Text-to-Speech
        tts=openai.TTS(
            model="tts-1",  # or "tts-1-hd" for higher quality
            voice="alloy"   # Options: alloy, echo, fable, onyx, nova, shimmer
        ),
        
        # Voice Activity Detection
        vad=silero.VAD.load(),
        
        # Turn Detection for better conversation flow (optional)
        turn_detection=turn_detection,
    )

    await session.start(
        room=ctx.room,
        agent=VoiceAssistant(),
        room_input_options=RoomInputOptions(
            # LiveKit Cloud enhanced noise cancellation
            # If self-hosting, omit this parameter
            noise_cancellation=noise_cancellation.BVC(),
        ),
    )

    await ctx.connect()
    
    print("Agent connected to room, waiting for participants...")
    
    # Wait a moment for the connection to stabilize
    await asyncio.sleep(2)
    
    # Send initial greeting
    try:
        await session.generate_reply(
            instructions="Say exactly this in Japanese: 'こんにちは！音声AIアシスタントです。接続テストが成功しました。何かお手伝いできることはありますか？'"
        )
        print("Initial greeting sent")
    except Exception as e:
        print(f"Failed to send initial greeting: {e}")
        # Try a simpler approach
        try:
            await session.generate_reply(
                instructions="Say 'Hello, I am your voice assistant. Connection test successful.'"
            )
            print("Simple greeting sent")
        except Exception as e2:
            print(f"Failed to send simple greeting: {e2}")


if __name__ == "__main__":
    # Run the agent
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
EOF
```

#### server.py
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

#### package.json
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

#### index.html
```bash
cat > index.html << 'EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LiveKit Voice Agent Web System</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF
```

#### vite.config.ts
```bash
cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
EOF
```

#### その他の設定ファイル
```bash
# TypeScript設定
cat > tsconfig.json << 'EOF'
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
EOF

cat > tsconfig.app.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
EOF

cat > tsconfig.node.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}
EOF

# Tailwind設定
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
EOF

cat > postcss.config.js << 'EOF'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
EOF

# ESLint設定
cat > eslint.config.js << 'EOF'
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  }
);
EOF
```

### 2. srcディレクトリとReactコンポーネントを作成

```bash
# srcディレクトリを作成
mkdir -p src/components src/hooks src/types

# メインファイル
cat > src/main.tsx << 'EOF'
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
EOF

cat > src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF

cat > src/vite-env.d.ts << 'EOF'
/// <reference types="vite/client" />
EOF
```

### 3. 環境変数ファイル作成
```bash
# .env.exampleを作成
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

### 4. 環境変数設定（重要！）
```bash
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

### 5. Docker起動
```bash
# ビルドして起動
/usr/local/bin/docker-compose build --no-cache
/usr/local/bin/docker-compose up -d

# ログ確認
/usr/local/bin/docker-compose logs -f
```

### 6. 動作確認
```bash
# コンテナ状態確認
/usr/local/bin/docker-compose ps

# ヘルスチェック
curl http://localhost:8000/health
```

## ⚠️ 重要な注意事項

1. **APIキー設定**: `.env`ファイルに実際のAPIキーを設定するまでエージェントは動作しません
2. **ファイル作成順序**: 上記の順序で作成してください
3. **権限確認**: ファイルが正しく作成されているか `ls -la` で確認してください

これで手動でプロジェクトファイルが作成され、Dockerビルドが可能になります。