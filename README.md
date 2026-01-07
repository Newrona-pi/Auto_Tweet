# 🤖 Auto_Tweet - AI News Aggregation System

AI-powered news aggregation system for automatic collection, clustering, and summarization of AI and semiconductor industry news.

## 🌟 Features

- **Automated RSS Collection**: Fetches news from 16 curated AI and semiconductor RSS feeds
- **Smart Clustering**: Groups related articles into topics using keyword-based clustering
- **Attention Scoring**: Ranks topics by recency and cluster size
- **AI Summarization**: Generates Japanese summaries and "why it's hot" explanations using OpenAI GPT-4
- **X Draft Generation**: Creates 80-140 character tweets optimized for engagement
- **Admin Dashboard**: Manual control interface with glassmorphism design
- **Privacy-First**: Stores only metadata (no full article text), prevents search indexing

## 🏗️ Architecture

**Infrastructure**: Vercel + Neon (Postgres) - **No Supabase/Railway/Render**

- **Frontend**: Next.js 14 (App Router)
- **Database**: Neon Postgres (Free tier available)
- **ORM**: Prisma
- **LLM**: OpenAI GPT-4
- **Deployment**: Vercel (Hobby plan compatible)

## 📋 Prerequisites

- Node.js 18+ 
- Neon account (free, no credit card required): https://neon.tech
- OpenAI API key: https://platform.openai.com/api-keys

## 🚀 Setup

### 1. Clone Repository

\`\`\`bash
git clone https://github.com/Newrona-pi/Auto_Tweet.git
cd Auto_Tweet
\`\`\`

### 2. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Configure Environment Variables

Create a \`.env\` file (or copy from \`.env.example\`):

\`\`\`bash
# Database (Neon Postgres)
DATABASE_URL="postgresql://user:password@ep-xxx.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

# OpenAI API
OPENAI_API_KEY="sk-proj-..."

# Feature Flags
ENABLE_ADMIN_AUTH=false
ENABLE_X_POSTING=false

# Security (Optional)
COLLECT_ENDPOINT_SECRET=""
\`\`\`

**Getting your Neon connection string:**

1. Go to https://neon.tech and sign up (free)
2. Create a new project (e.g., "auto-tweet")
3. Copy the connection string from the dashboard
4. Paste it into \`DATABASE_URL\` in your \`.env\` file

### 4. Initialize Database

\`\`\`bash
# Run migrations
npx prisma migrate dev --name init

# Seed with 16 RSS feeds
npx prisma db seed
\`\`\`

### 5. Run Development Server

\`\`\`bash
npm run dev
\`\`\`

Visit:
- Main page: http://localhost:3000
- Admin dashboard: http://localhost:3000/admin

## 📡 RSS Feed Sources

The system pre-seeds 16 high-quality sources:

### AI/LLM (English)
- OpenAI News
- Google Blog
- Google Research Blog
- AWS ML Blog
- Hugging Face Blog
- Apple ML Research
- MIT News - AI
- arXiv cs.AI

### AI/Tech (Japanese)
- ITmedia AI+
- Zenn LLM Topic

### Semiconductor (English)
- NVIDIA Blog
- NVIDIA Newsroom
- SemiEngineering
- EE Times

### Semiconductor (Japanese)
- EE Times Japan
- MONOist

## 🎯 Usage Workflow

1. **Collect News**: Click "Collect Now" to fetch latest articles from RSS feeds
2. **Summarize Topics**: Click "Summarize Now" to:
   - Cluster articles into topics
   - Calculate attention scores
   - Generate Japanese summaries
   - Create X drafts (80-140 characters)
3. **Review Drafts**: (Future) View and manually approve drafts
4. **Post to X**: (Future, feature-flagged) Automatically post approved drafts

## 🔒 Security

- **No Admin Auth (MVP)**: Admin interface is accessible without password (`ENABLE_ADMIN_AUTH=false`)
  - **Important**: Keep deployment URL private
  - Feature flag prepared for future Basic Auth implementation
- **No Full-Text Storage**: Only article metadata (title, URL, description snippet) is stored
- **Search Engine Protection**: `/admin` routes have `X-Robots-Tag: noindex`
- **Endpoint Secret Ready**: `COLLECT_ENDPOINT_SECRET` can be enabled for API protection

## 🚢 Deployment to Vercel

### 1. Push to GitHub

\`\`\`bash
git add .
git commit -m "Initial commit"
git push origin main
\`\`\`

### 2. Deploy to Vercel

1. Visit https://vercel.com and sign up
2. Click "New Project"
3. Import your GitHub repository
4. Configure environment variables:
   - \`DATABASE_URL\`: Your Neon connection string
   - \`OPENAI_API_KEY\`: Your OpenAI API key
   - \`ENABLE_ADMIN_AUTH\`: \`false\`
   - \`ENABLE_X_POSTING\`: \`false\`
5. Click "Deploy"

### 3. Run Database Migrations on Vercel

After first deployment, run migrations:

\`\`\`bash
# From your local terminal
npx prisma migrate deploy
npx prisma db seed
\`\`\`

Or use Vercel's built-in Postgres features (if using Vercel Postgres instead of Neon).

## 📊 Database Schema

- **sources**: RSS feed sources (name, URL, category, language)
- **items**: Collected articles (title, URL, description, attention score)
- **topics**: Clustered topic groups
- **summaries**: AI-generated Japanese summaries and "why hot" explanations
- **draft_posts**: X draft posts (80-140 characters)

## 🛠️ Development

### Available Scripts

\`\`\`bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npx prisma studio    # Open Prisma database GUI
\`\`\`

### Database Commands

\`\`\`bash
npx prisma migrate dev       # Create and apply migrations
npx prisma db seed           # Seed database with RSS feeds
npx prisma studio            # Visual database editor
npx prisma generate          # Regenerate Prisma client
\`\`\`

## 🔮 Future Enhancements

- [ ] Admin authentication (Basic Auth or password)
- [ ] X (Twitter) API integration for auto-posting
- [ ] UI for viewing/editing drafts before posting
- [ ] Statistics dashboard (items collected, topics created, etc.)
- [ ] YouTube channel integration
- [ ] Gemini LLM support (in addition to OpenAI)
- [ ] Webhook support for automated scheduling

## 📝 License

Private project - All rights reserved

## 🙋 Support

For issues or questions, please contact the repository owner.

---

**Note**: This is an MVP designed for private use. The admin interface is **not password-protected** by default. Keep your deployment URL confidential and enable authentication before public deployment.
