import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const sources = [
    // AI/LLM Sources (English)
    {
        name: 'OpenAI News',
        url: 'https://openai.com/news/rss.xml',
        category: 'ai',
        language: 'en',
    },
    {
        name: 'Google Blog',
        url: 'https://blog.google/rss/',
        category: 'ai',
        language: 'en',
    },
    {
        name: 'Google Research Blog',
        url: 'https://feeds.feedburner.com/blogspot/gJZg',
        category: 'ai',
        language: 'en',
    },
    {
        name: 'AWS Machine Learning Blog',
        url: 'https://aws.amazon.com/blogs/machine-learning/feed/',
        category: 'ai',
        language: 'en',
    },
    {
        name: 'Hugging Face Blog',
        url: 'https://huggingface.co/blog/feed.xml',
        category: 'ai',
        language: 'en',
    },
    {
        name: 'Apple ML Research',
        url: 'https://machinelearning.apple.com/rss.xml',
        category: 'ai',
        language: 'en',
    },
    {
        name: 'MIT News - AI',
        url: 'https://news.mit.edu/topic/mitartificial-intelligence2-rss.xml',
        category: 'ai',
        language: 'en',
    },
    {
        name: 'arXiv cs.AI',
        url: 'https://arxiv.org/rss/cs.AI',
        category: 'ai',
        language: 'en',
    },
    // Japanese AI/Tech Sources
    {
        name: 'ITmedia AI+',
        url: 'https://rss.itmedia.co.jp/rss/2.0/aiplus.xml',
        category: 'ai',
        language: 'ja',
    },
    {
        name: 'Zenn - LLM Topic',
        url: 'https://zenn.dev/topics/llm/feed',
        category: 'ai',
        language: 'ja',
    },
    // Semiconductor/Hardware Sources (English)
    {
        name: 'NVIDIA Blog',
        url: 'https://blogs.nvidia.com/feed/',
        category: 'semiconductor',
        language: 'en',
    },
    {
        name: 'NVIDIA Newsroom',
        url: 'https://nvidianews.nvidia.com/rss',
        category: 'semiconductor',
        language: 'en',
    },
    {
        name: 'SemiEngineering',
        url: 'https://semiengineering.com/feed/',
        category: 'semiconductor',
        language: 'en',
    },
    {
        name: 'EE Times',
        url: 'https://www.eetimes.com/feed/',
        category: 'semiconductor',
        language: 'en',
    },
    // Semiconductor/Hardware Sources (Japanese)
    {
        name: 'EE Times Japan',
        url: 'https://rss.itmedia.co.jp/rss/2.0/eetimes.xml',
        category: 'semiconductor',
        language: 'ja',
    },
    {
        name: 'MONOist',
        url: 'https://rss.itmedia.co.jp/rss/2.0/monoist.xml',
        category: 'semiconductor',
        language: 'ja',
    },
];

async function main() {
    console.log('🌱 Starting seed...');

    // Clear existing data (optional, comment out if you want to keep existing data)
    await prisma.draftPost.deleteMany();
    await prisma.summary.deleteMany();
    await prisma.item.deleteMany();
    await prisma.topic.deleteMany();
    await prisma.source.deleteMany();

    console.log('✨ Cleared existing data');

    // Create sources
    for (const source of sources) {
        await prisma.source.create({
            data: source,
        });
    }

    console.log(`✅ Seeded ${sources.length} RSS feed sources`);
    console.log('   - AI/LLM sources (EN): 8');
    console.log('   - AI/Tech sources (JA): 2');
    console.log('   - Semiconductor sources (EN): 4');
    console.log('   - Semiconductor sources (JA): 2');
    console.log('🎉 Seed completed!');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
