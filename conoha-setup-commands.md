# 🔑 ConoHa VPS セットアップ - 実行コマンド

## 1. 現在の状況確認
```bash
# 現在のディレクトリとファイル確認
pwd
ls -la
```

## 2. 環境変数ファイル作成
```bash
# .envファイルを作成
cp .env.example .env

# .envファイルを編集
nano .env
```

### .envファイルの内容（nanoエディタで編集）
```env
# LiveKit Configuration
LIVEKIT_API_KEY=your_actual_livekit_api_key_here
LIVEKIT_API_SECRET=your_actual_livekit_secret_here
LIVEKIT_URL=wss://talktune-exng0106.livekit.cloud

# OpenAI Configuration
OPENAI_API_KEY=your_actual_openai_api_key_here

# Room configuration
DEFAULT_ROOM_NAME=talktune
```

**重要**: `your_actual_*` の部分を実際のAPIキーに置き換えてください

### nanoエディタの操作方法
- 編集後: `Ctrl + X` → `Y` → `Enter` で保存

## 3. Docker Compose でビルド・起動
```bash
# Dockerイメージをビルド
/usr/local/bin/docker-compose build

# バックグラウンドで起動
/usr/local/bin/docker-compose up -d

# ログを確認（リアルタイム）
/usr/local/bin/docker-compose logs -f
```

## 4. 動作確認
```bash
# コンテナ状態確認
/usr/local/bin/docker-compose ps

# ヘルスチェック
curl http://localhost:8000/health

# サービス状態確認
/usr/local/bin/docker-compose logs voice-agent
```

## 5. 外部アクセステスト
ブラウザで以下にアクセス：
- `http://あなたのVPS-IP:8000`

## トラブルシューティング
```bash
# ポート確認
netstat -tlnp | grep :8000

# ファイアウォール確認
ufw status

# 環境変数確認
/usr/local/bin/docker-compose exec voice-agent env | grep LIVEKIT
/usr/local/bin/docker-compose exec voice-agent env | grep OPENAI
```