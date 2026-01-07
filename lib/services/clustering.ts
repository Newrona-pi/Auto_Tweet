import { prisma } from '@/lib/prisma';

export interface ClusteringResult {
    topicsCreated: number;
    itemsClustered: number;
}

// Simple clustering based on keyword similarity and time proximity
export async function clusterItems(): Promise<ClusteringResult> {
    console.log('🔍 Starting clustering...');

    // Get recent unclustered items (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const items = await prisma.item.findMany({
        where: {
            publishedAt: { gte: sevenDaysAgo },
            topicId: null,
        },
        orderBy: {
            publishedAt: 'desc',
        },
    });

    if (items.length === 0) {
        console.log('  No unclustered items found');
        return { topicsCreated: 0, itemsClustered: 0 };
    }

    console.log(`  Found ${items.length} unclustered items`);

    // Extract keywords from titles
    const keywords = extractKeywords(items.map((i) => i.title));
    const topKeywords = keywords.slice(0, 10); // Top 10 topics

    let topicsCreated = 0;
    let itemsClustered = 0;

    for (const keyword of topKeywords) {
        // Find items matching this keyword
        const matchingItems = items.filter((item) =>
            item.title.toLowerCase().includes(keyword.toLowerCase())
        );

        if (matchingItems.length >= 2) {
            // Create topic
            const topic = await prisma.topic.create({
                data: {
                    name: keyword,
                },
            });

            // Assign items to topic and calculate attention scores
            for (const item of matchingItems) {
                const attentionScore = calculateAttentionScore(
                    item.publishedAt,
                    matchingItems.length
                );

                await prisma.item.update({
                    where: { id: item.id },
                    data: {
                        topicId: topic.id,
                        attentionScore,
                    },
                });

                itemsClustered++;
            }

            topicsCreated++;
            console.log(`  ✓ Created topic "${keyword}" with ${matchingItems.length} items`);
        }
    }

    console.log(`✅ Clustering complete: ${topicsCreated} topics, ${itemsClustered} items clustered`);

    return {
        topicsCreated,
        itemsClustered,
    };
}

// Extract common keywords from titles
function extractKeywords(titles: string[]): string[] {
    const wordCounts = new Map<string, number>();

    // Common AI/tech keywords to look for
    const importantKeywords = [
        'AI', 'GPT', 'LLM', 'OpenAI', 'Google', 'Microsoft', 'Meta', 'Apple',
        'NVIDIA', 'AMD', 'Intel', 'chip', 'semiconductor', 'GPU', 'CPU',
        'machine learning', 'deep learning', 'neural', 'model', 'training',
        'ChatGPT', 'Gemini', 'Claude', 'Llama', 'transformer', 'breakthrough'
    ];

    for (const title of titles) {
        const lowerTitle = title.toLowerCase();
        for (const keyword of importantKeywords) {
            if (lowerTitle.includes(keyword.toLowerCase())) {
                wordCounts.set(keyword, (wordCounts.get(keyword) || 0) + 1);
            }
        }
    }

    // Sort by frequency
    return Array.from(wordCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([word]) => word);
}

// Calculate attention score based on recency and cluster size
function calculateAttentionScore(publishedAt: Date, clusterSize: number): number {
    const now = new Date();
    const ageInHours = (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60);

    // Recency score (0-1, higher for newer items)
    const recencyScore = Math.max(0, 1 - ageInHours / 168); // 168 hours = 7 days

    // Cluster size score (normalized)
    const clusterScore = Math.min(clusterSize / 10, 1);

    // Combined score (weighted average)
    const attentionScore = recencyScore * 0.6 + clusterScore * 0.4;

    return Math.round(attentionScore * 100) / 100;
}
