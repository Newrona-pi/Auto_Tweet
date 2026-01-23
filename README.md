# 🤖 Auto_Tweet (System 1) - Bible v3.3

AI/半導体業界の最新ニュースを自動で収集・クラスタリング・要約し、X（旧Twitter）投稿用のドラフトを生成して外部ボット（System 2）に提供するヘッドレスCMSシステムです。

**Bible v3.3 仕様**により、厳密なドラフトステートマシン（Lease/Reserve/Schedule）と堅牢なPull型API (`/api/feed`) を備えています。

## 🌟 主な機能

- **自動RSS収集**: 厳選された16のAI・半導体関連RSSフィードからニュースを取得 (収集エラー耐性強化済み)
- **スマート・クラスタリング**: キーワードベースのクラスタリングとアテンション・スコアリング
- **AI要約 & ドラフト生成**: OpenAI GPT-4oによる「口語体」の日本語要約と「なぜ注目？」の解説
- **Draft State Machine**: 投稿重複を防ぐための厳格な状態管理 (NEW -> LEASED -> RESERVED -> ACKED / PUBLISHED)
- **API Feed**: 外部ボット向けのPull型配信エンドポイント（レート制限、認証、Housekeeping機能付き）
- **Sleep Carry-Over**: 深夜帯のニュースは翌朝7:00以降までドラフト有効期限 (`notAfter`) を自動延長

## 🏗️ アーキテクチャ

**構成**: System 1 (本システム) -> API Pull -> System 2 (Playwright Bot / 外部)

- **Frontend/API**: Next.js 14 (App Router)
- **Database**: Neon Postgres (Prisma ORM)
- **Job Control**: API-driven State Machine
- **LLM**: OpenAI GPT-4o

## 📋 環境変数の設定

`.env` ファイルに以下を設定してください:

```bash
# Database & OpenAI
DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require"
OPENAI_API_KEY="sk-proj-..."

# Bible v3.3 API Keys
FEED_API_KEY="your-secure-feed-api-key"   # System 2連携用 (必須)
ADMIN_API_KEY="your-admin-api-key"        # 管理者操作用 (必須)

# Spec Constants (デフォルト値推奨)
FEED_MIN_INTERVAL_SECONDS=30
FEED_WINDOW_HOURS=24
LEASE_TTL_MINUTES=30
RESERVE_GRACE_MINUTES=60
FAIL_REOFFER_COOLDOWN_MINUTES=10

# Feature Flags
ENABLE_ADMIN_AUTH=true # 推奨
ENABLE_X_POSTING=false # System 1では投稿しないためfalse
```

## 🚀 セットアップと運用

### 1. インストール
```bash
git clone https://github.com/Newrona-pi/Auto_Tweet.git
npm install
```

### 2. データベース初期化
```bash
npx prisma migrate dev
npx prisma db seed # RSSソースの登録
```

### 3. ビルド & 起動
```bash
npm run build
npm start
```

### 4. 運用フロー (API)
外部ボット (System 2) は以下のフローで投稿を行います:
1. `GET /api/feed`: `NEW` 状態のドラフト一覧を取得
2. `POST /api/lease`: ドラフトを一時的にロック (`LEASED`)
3. `POST /api/reserve`: 投稿時間を決定し予約 (`RESERVED`)
4. System 2 が投稿を実行
5. `POST /api/ack`: 投稿完了を報告 (`ACKED` / `PUBLISHED`)

## 🛠️ 管理機能 (/api/admin/summarize)

CronJob等から POST リクエストを送ることで定期実行します。

```bash
curl -X POST "https://your-domain.com/api/admin/summarize?admin_key=your-admin-key"
```
- RSS収集
- クラスタリング & スコアリング
- 要約 & ドラフト生成 (Impact Score < 40 はスキップ)
- Housekeeping (期限切れドラフトの整理)

## 📊 データベース・スキーマ
- **DraftPost**: ステートマシン (`state`, `notAfter`, `leaseOwner` 等) を持つ中心モデル
- **ApiClient**: Feed APIのレート制限管理用

## 📝 ライセンス
Private Project - All rights reserved.
