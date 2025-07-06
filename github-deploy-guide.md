# 🚀 GitHubからConoHa VPSへのデプロイガイド

## 📍 現在の状況
✅ ローカルファイルが更新済み (`useLiveKitVoiceAgent.ts`)  
✅ GitHubリポジトリが存在 (`https://github.com/aioikid/voice-agent`)  
✅ ConoHa VPSが稼働中  
🔄 **目標**: 更新されたコードをVPSにデプロイ  

## 🔧 手順1: ローカルからGitHubにプッシュ

### 1-1. 変更をコミット
```bash
# 変更されたファイルを確認
git status

# 変更をステージング
git add src/hooks/useLiveKitVoiceAgent.ts

# コミット
git commit -m "Fix microphone access issues with simplified approach"

# GitHubにプッシュ
git push origin main
```

## 🌐 手順2: ConoHa VPSで最新コードを取得

### 2-1. VPSにSSH接続
```bash
ssh root@160.251.140.29
```

### 2-2. プロジェクトディレクトリに移動
```bash
cd /opt/voice-agent
```

### 2-3. 現在のコンテナを停止
```bash
# 現在のコンテナを停止
sudo docker-compose down
```

### 2-4. 最新コードを取得
```bash
# GitHubから最新コードを取得
git pull origin main

# 変更されたファイルを確認
git log --oneline -5
```

### 2-5. Dockerイメージを再ビルド
```bash
# キャッシュを使わずに完全再ビルド
sudo docker-compose build --no-cache

# バックグラウンドで起動
sudo docker-compose up -d
```

### 2-6. デプロイ状況を確認
```bash
# コンテナの状態確認
sudo docker-compose ps

# ログを確認
sudo docker-compose logs -f voice-agent
```

## 🔍 手順3: 動作確認

### 3-1. ヘルスチェック
```bash
# ローカルでの確認
curl http://localhost:8000/health

# 外部からの確認
curl https://talktune.biz/health
```

### 3-2. ブラウザでの確認
1. `https://talktune.biz` にアクセス
2. マイクアクセスの動作を確認
3. 音声エージェントとの接続をテスト

## 🔄 自動デプロイの設定（オプション）

### GitHub Actionsを使用した自動デプロイ

#### 4-1. GitHub Actionsワークフローファイルを作成
```bash
# ローカルで以下のディレクトリを作成
mkdir -p .github/workflows

# ワークフローファイルを作成
cat > .github/workflows/deploy.yml << 'EOF'
name: Deploy to ConoHa VPS

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Deploy to VPS
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.VPS_HOST }}
        username: ${{ secrets.VPS_USERNAME }}
        key: ${{ secrets.VPS_SSH_KEY }}
        script: |
          cd /opt/voice-agent
          git pull origin main
          sudo docker-compose down
          sudo docker-compose build --no-cache
          sudo docker-compose up -d
          sudo docker-compose ps
EOF
```

#### 4-2. GitHubリポジトリにシークレットを設定
GitHubリポジトリの Settings → Secrets and variables → Actions で以下を設定：

- `VPS_HOST`: `160.251.140.29`
- `VPS_USERNAME`: `root`
- `VPS_SSH_KEY`: SSH秘密鍵の内容

#### 4-3. ワークフローファイルをコミット
```bash
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Actions auto-deploy workflow"
git push origin main
```

## 🚨 トラブルシューティング

### 問題1: git pullが失敗する
```bash
# 現在のブランチを確認
git branch

# リモートの状態を確認
git remote -v

# 強制的に最新状態に同期
git fetch origin
git reset --hard origin/main
```

### 問題2: Dockerビルドが失敗する
```bash
# 古いイメージとコンテナを削除
sudo docker system prune -a

# 再度ビルド
sudo docker-compose build --no-cache
```

### 問題3: ポート競合エラー
```bash
# 使用中のポートを確認
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# 必要に応じてプロセスを停止
sudo pkill -f nginx
```

### 問題4: 権限エラー
```bash
# プロジェクトディレクトリの権限を修正
sudo chown -R root:root /opt/voice-agent
sudo chmod -R 755 /opt/voice-agent
```

## 📋 デプロイチェックリスト

### 手動デプロイの場合
- [ ] ローカルでファイルを更新
- [ ] `git add`, `git commit`, `git push`
- [ ] VPSにSSH接続
- [ ] `cd /opt/voice-agent`
- [ ] `sudo docker-compose down`
- [ ] `git pull origin main`
- [ ] `sudo docker-compose build --no-cache`
- [ ] `sudo docker-compose up -d`
- [ ] 動作確認

### 自動デプロイの場合
- [ ] GitHub Actionsワークフロー設定
- [ ] GitHubシークレット設定
- [ ] `git push`で自動デプロイ実行
- [ ] GitHub Actionsの実行結果確認
- [ ] 動作確認

## ⚡ クイックデプロイコマンド

VPSで以下のコマンドを実行するだけで最新版をデプロイできます：

```bash
cd /opt/voice-agent && \
sudo docker-compose down && \
git pull origin main && \
sudo docker-compose build --no-cache && \
sudo docker-compose up -d && \
sudo docker-compose ps
```

## 🎯 完了後の確認

1. **ブラウザアクセス**: `https://talktune.biz`
2. **マイクテスト**: 詳細マイクテストボタンをクリック
3. **音声接続**: 接続ボタンで音声エージェントに接続
4. **動作確認**: 実際に音声でやり取りをテスト

---

**まずは手動デプロイから始めて、動作確認後に自動デプロイを設定することをお勧めします。**