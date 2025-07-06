# 🔧 Gitリポジトリ修復とデプロイ手順

## 📍 現在の問題
❌ `/opt/voice-agent`がGitリポジトリではない  
❌ `git pull`が実行できない  
✅ ConoHa VPS稼働中  
✅ 更新されたコードがGitHubにある  

## 🚀 解決手順

### 手順1: 現在のファイルをバックアップ

```bash
# 現在のディレクトリを確認
pwd

# 現在の設定ファイルをバックアップ
sudo cp /opt/voice-agent/.env /tmp/voice-agent-env-backup
sudo cp /opt/voice-agent/nginx.conf /tmp/nginx-conf-backup

# SSL証明書もバックアップ（存在する場合）
sudo cp -r /opt/voice-agent/ssl /tmp/ssl-backup 2>/dev/null || echo "SSL証明書なし"

# バックアップ確認
ls -la /tmp/*backup*
```

### 手順2: 現在のコンテナを停止

```bash
# 現在のコンテナを停止
cd /opt/voice-agent
sudo docker-compose down

# コンテナが停止したことを確認
sudo docker-compose ps
```

### 手順3: 古いディレクトリを削除してGitHubからクローン

```bash
# 親ディレクトリに移動
cd /opt

# 古いディレクトリを削除
sudo rm -rf voice-agent

# GitHubから最新版をクローン
sudo git clone https://github.com/aioikid/voice-agent.git

# 新しいディレクトリに移動
cd voice-agent

# Gitリポジトリが正しく設定されているか確認
git status
git remote -v
```

### 手順4: バックアップした設定ファイルを復元

```bash
# .envファイルを復元
sudo cp /tmp/voice-agent-env-backup .env

# nginx.confを復元（HTTPS設定済みの場合）
sudo cp /tmp/nginx-conf-backup nginx.conf

# SSL証明書を復元（存在する場合）
sudo cp -r /tmp/ssl-backup ssl 2>/dev/null || echo "SSL証明書の復元をスキップ"

# 権限を設定
sudo chmod 600 .env
sudo chmod 644 nginx.conf
sudo chmod -R 600 ssl/* 2>/dev/null || echo "SSL権限設定をスキップ"

# ファイルが正しく復元されたか確認
ls -la
```

### 手順5: Dockerコンテナを再ビルド・起動

```bash
# Dockerイメージをビルド
sudo docker-compose build --no-cache

# バックグラウンドで起動
sudo docker-compose up -d

# 起動状況を確認
sudo docker-compose ps

# ログを確認
sudo docker-compose logs -f voice-agent
```

### 手順6: 動作確認

```bash
# ヘルスチェック
curl http://localhost:8000/health

# 外部アクセス確認
curl https://talktune.biz/health
```

## 🔄 今後の更新手順

これで正しいGitリポジトリが設定されたので、今後は以下のコマンドで更新できます：

```bash
cd /opt/voice-agent

# 最新コードを取得
sudo git pull origin main

# コンテナを再起動
sudo docker-compose down
sudo docker-compose build --no-cache
sudo docker-compose up -d

# 動作確認
sudo docker-compose ps
```

## ⚡ ワンライナーコマンド

今後の更新は以下のコマンド一発で実行できます：

```bash
cd /opt/voice-agent && sudo docker-compose down && sudo git pull origin main && sudo docker-compose build --no-cache && sudo docker-compose up -d && sudo docker-compose ps
```

## 🔍 トラブルシューティング

### 問題1: Gitクローンが失敗する場合
```bash
# HTTPSでクローンを試行
sudo git clone https://github.com/aioikid/voice-agent.git

# それでも失敗する場合はSSHキーを設定
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
# 生成された公開鍵をGitHubに追加
```

### 問題2: 権限エラーが発生する場合
```bash
# プロジェクトディレクトリの権限を修正
sudo chown -R root:root /opt/voice-agent
sudo chmod -R 755 /opt/voice-agent
```

### 問題3: .envファイルが見つからない場合
```bash
# .env.exampleから作成
sudo cp .env.example .env

# 必要な環境変数を設定
sudo nano .env
```

## 📋 実行チェックリスト

- [ ] **手順1**: 設定ファイルをバックアップ
- [ ] **手順2**: 現在のコンテナを停止
- [ ] **手順3**: GitHubからクローン
- [ ] **手順4**: 設定ファイルを復元
- [ ] **手順5**: Docker再ビルド・起動
- [ ] **手順6**: 動作確認

## ⚠️ 重要な注意事項

1. **バックアップ**: 設定ファイルは必ずバックアップしてから作業
2. **環境変数**: `.env`ファイルの内容は機密情報なので注意
3. **SSL証明書**: 証明書ファイルも忘れずにバックアップ・復元
4. **権限**: ファイルの権限設定を正しく行う

---

**この手順で、正しいGitリポジトリが設定され、今後の更新が簡単になります！**