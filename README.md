# 🤖 Auto_Tweet - AIニュース収集システム

AI/半導体業界の最新ニュースを自動で収集・クラスタリング・要約し、X（旧Twitter）投稿用のドラフトを生成するシステムです。

## 🌟 主な機能

- **自動RSS収集**: 厳選された16のAI・半導体関連RSSフィードからニュースを取得
- **スマート・クラスタリング**: キーワードベースのクラスタリングにより、関連記事をトピックごとにグループ化
- **アテンション・スコアリング**: 鮮度と情報の密度に基づき、トピックに優先順位を付与
- **AI要約**: OpenAI GPT-4を使用して、日本語の要約と「なぜ注目なのか」の解説を生成
- **X投稿ドラフト生成**: エンゲージメントを考慮した80〜140文字の投稿文を生成
- **管理画面**: モダンなグラスモーフィズムデザインを採用した手動操作インターフェース
- **プライバシー配慮**: 記事の全文は保存せず、メタデータのみを保持（検索エンジンインデックス除外設定済み）

## 🏗️ 構成

**インフラ**: Vercel + Neon (Postgres) - **Supabase/Railway/Renderは不使用**

- **フロントエンド**: Next.js 14 (App Router)
- **データベース**: Neon Postgres (無料枠を使用)
- **ORM**: Prisma
- **LLM**: OpenAI GPT-4
- **デプロイ**: Vercel (Hobbyプラン対応)

## 📋 事前準備

- Node.js 18以上
- Neonアカウント (無料、クレカ不要): https://neon.tech
- OpenAI APIキー: https://platform.openai.com/api-keys

## 🚀 セットアップ手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/Newrona-pi/Auto_Tweet.git
cd Auto_Tweet
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env` ファイルを作成（または `.env.example` をコピー）：

```bash
# Database (Neon Postgres)
DATABASE_URL="postgresql://user:password@ep-xxx.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

# OpenAI API
OPENAI_API_KEY="sk-proj-..."

# Feature Flags (機能フラグ)
ENABLE_ADMIN_AUTH=false
ENABLE_X_POSTING=false

# セキュリティ設定 (任意)
COLLECT_ENDPOINT_SECRET=""
```

**Neon接続文字列の取得方法:**

1. https://neon.tech にサインアップ (無料)
2. 新しいプロジェクトを作成 (例: "auto-tweet")
3. ダッシュボードから "Connection String" をコピー
4. `.env` の `DATABASE_URL` に貼り付け

### 4. データベースの初期化

```bash
# マイグレーションの実行
npx prisma migrate dev --name init

# 16のRSSソースをシード
npx prisma db seed
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

アクセス先:
- メインページ: http://localhost:3000
- 管理画面: http://localhost:3000/admin

## 📡 RSSフィード・ソース

初期設定で以下の16の高品質なソースが登録されています：

### AI/LLM (英語)
- OpenAI News
- Google Blog
- Google Research Blog
- AWS ML Blog
- Hugging Face Blog
- Apple ML Research
- MIT News - AI
- arXiv cs.AI

### AI/技術 (日本語)
- ITmedia AI+
- Zenn LLMトピック

### 半導体 (英語)
- NVIDIA Blog
- NVIDIA Newsroom
- SemiEngineering
- EE Times

### 半導体 (日本語)
- EE Times Japan
- MONOist

## 🎯 運用フロー

1. **ニュース収集 (Collect News)**: 「Collect Now」をクリックして最新記事を取得
2. **トピック要約 (Summarize Topics)**: 「Summarize Now」をクリックして以下を実行
   - 記事のクラスタリング
   - アテンションスコアの計算
   - 日本語要約の生成
   - X投稿用ドラフトの生成 (80〜140文字)
3. **内容確認**: (将来機能) 生成されたドラフトを確認・修正
4. **Xへ投稿**: (将来機能) 承認されたドラフトをXに自動投稿

## 🔒 セキュリティ

- **認証なし (MVP)**: 管理画面はパスワードなしでアクセス可能です (`ENABLE_ADMIN_AUTH=false`)
  - **重要**: デプロイ先のURLは非公開にしてください
  - 将来のBasic認証/パスワード認証追加のための下地は用意されています
- **全文保存なし**: 記事のメタデータ（タイトル、URL、抜粋）のみを保存します
- **検索除外**: `/admin` ルートには `X-Robots-Tag: noindex` が設定されています
- **API保護**: `COLLECT_ENDPOINT_SECRET` を設定することでAPIアクセスを制限可能です

## 🚢 Vercelへのデプロイ

### 1. GitHubへのプッシュ

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Vercelでデプロイ

1. https://vercel.com にアクセス
2. 「New Project」をクリック
3. GitHubリポジトリをインポート
4. 環境変数を設定:
   - `DATABASE_URL`: Neonの接続文字列
   - `OPENAI_API_KEY`: OpenAIのAPIキー
   - `ENABLE_ADMIN_AUTH`: `false`
   - `ENABLE_X_POSTING`: `false`
5. 「Deploy」をクリック

### 3. 本番DBの初期化

デプロイ後、ローカルから本番DBに対して以下を実行します：

```bash
# 環境変数を本番用に書き換えて実行、または手動で同期
npx prisma migrate deploy
npx prisma db seed
```

## 📊 データベース・スキーマ

- **sources**: RSSソース情報 (名称、URL、カテゴリ、言語)
- **items**: 収集された記事 (タイトル、URL、抜粋、スコア)
- **topics**: 抽出されたトピックグループ
- **summaries**: AI生成された要約と注目ポイント解説
- **draft_posts**: 投稿用ドラフト (80〜140文字)

## 🛠️ 開発用スクリプト

```bash
npm run dev          # 開発サーバー起動
npm run build        # 本番用ビルド
npm run start        # 本番サーバー起動
npm run lint         # リンター実行
npx prisma studio    # DBブラウザ起動
```

## 🔮 今後の改善予定

- [ ] 管理画面の認証機能 (Basic Auth or パスワード)
- [ ] X (Twitter) API連携による自動投稿
- [ ] 投稿前の下書き編集UI
- [ ] 統計ダッシュボード (収集数、トピック作成数など)
- [ ] YouTubeチャンネル連携
- [ ] Gemini LLMのサポート
- [ ] 定期実行(Cron Job)による自動運用

## 📝 ライセンス

プライベートプロジェクト - All rights reserved

---

**注意**: 本システムは個人利用を想定したMVPです。管理画面はデフォルトでパスワード保護されていません。デプロイ先のURLを厳重に管理するか、必要に応じて認証機能を有効にしてください。
<!-- Last updated: 01/08/2026 10:35:13 -->
<!-- Trigger Deploy: Admin Dashboard Update 01/08/2026 16:45:05 -->
