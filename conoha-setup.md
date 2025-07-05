# 🚀 ConoHa VPS Docker セットアップガイド

## 📋 現在の状況確認

コンソールで `/opt/voice-agent` ディレクトリにいることが確認できました。
次の手順でセットアップを完了させましょう。

## 🔥 1. ファイアウォール設定

### ConoHa コントロールパネルでの設定
1. ConoHaコントロールパネルにログイン
2. 「セキュリティグループ」→「セキュリティグループ一覧」
3. 使用中のセキュリティグループを選択
4. 以下のルールを追加：

```
方向: インバウンド
プロトコル: TCP
ポート: 22 (SSH)
送信元: 0.0.0.0/0

方向: インバウンド  
プロトコル: TCP
ポート: 80 (HTTP)
送信元: 0.0.0.0/0

方向: インバウンド
プロトコル: TCP  
ポート: 443 (HTTPS)
送信元: 0.0.0.0/0

方向: インバウンド
プロトコル: TCP
ポート: 8000 (アプリケーション)
送信元: 0.0.0.0/0
```

### サーバー内でのファイアウォール設定
コンソールで以下を実行：

```bash
# UFWファイアウォールを設定
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp  
ufw allow 443/tcp
ufw allow 8000/tcp
ufw status
```

## 🐳 2. Docker Compose セットアップ

### 現在のディレクトリでファイルを確認
```bash
ls -la
pwd
```

### プロジェクトファイルをGitHubから取得（推奨）
```bash
# 既存のファイルをバックアップ
mv /opt/voice-agent /opt/voice-agent-backup-$(date +%Y%m%d)

# 新しくクローン
cd /opt
git clone https://github.com/your-username/your-repo-name.git voice-agent
cd voice-agent
```

### または、手動でファイルをアップロード
SCPやFTPでプロジェクトファイルをアップロードしてください。

## 🔑 3. 環境変数設定

### .envファイルを作成
```bash
cd /opt/voice-agent
cp .env.example .env
nano .env
```

### .envファイルの内容を編集
```env
# LiveKit Configuration
LIVEKIT_API_KEY=your_actual_livekit_api_key
LIVEKIT_API_SECRET=your_actual_livekit_secret  
LIVEKIT_URL=wss://your-livekit-server.com

# OpenAI Configuration
OPENAI_API_KEY=your_actual_openai_api_key

# Room configuration
DEFAULT_ROOM_NAME=talktune
```

**重要**: `your_actual_*` の部分を実際のAPIキーに置き換えてください。

## 🚀 4. Docker Compose でビルド・起動

```bash
# Dockerイメージをビルド
docker-compose build

# バックグラウンドで起動
docker-compose up -d

# ログを確認
docker-compose logs -f
```

## 🔍 5. 動作確認

### サービス状態確認
```bash
# コンテナ状態確認
docker-compose ps

# ヘルスチェック
curl http://localhost:8000/health

# 外部からのアクセステスト
curl http://your-vps-ip:8000/health
```

### ブラウザでアクセス
- `http://your-vps-ip:8000` でWebアプリケーションにアクセス

## 🔧 6. トラブルシューティング

### ポートが開いているか確認
```bash
netstat -tlnp | grep :8000
netstat -tlnp | grep :80
```

### ファイアウォール状態確認
```bash
ufw status verbose
iptables -L
```

### Dockerログ確認
```bash
# 全体のログ
docker-compose logs

# 特定のサービスのログ
docker-compose logs voice-agent
docker-compose logs nginx
```

### コンテナ内部確認
```bash
# コンテナに入る
docker-compose exec voice-agent /bin/bash

# 環境変数確認
docker-compose exec voice-agent env | grep LIVEKIT
docker-compose exec voice-agent env | grep OPENAI
```

## 🔄 7. サービス管理

### 再起動
```bash
docker-compose restart
```

### 停止
```bash
docker-compose down
```

### 完全リビルド
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 📱 8. アクセス方法

デプロイ完了後：
- **Webアプリ**: `http://your-vps-ip:8000`
- **API**: `http://your-vps-ip:8000/docs`
- **ヘルスチェック**: `http://your-vps-ip:8000/health`

## ⚠️ 注意事項

1. **APIキー設定**: 実際のAPIキーを設定するまでエージェントは動作しません
2. **セキュリティ**: 本番環境では適切なセキュリティ設定を行ってください
3. **SSL**: 本番環境ではHTTPS設定を推奨します
4. **モニタリング**: ログ監視とアラート設定を行ってください

---

**次のステップ**: 
1. ファイアウォール設定
2. .envファイルにAPIキー設定
3. `docker-compose up -d` で起動
4. ブラウザでアクセステスト