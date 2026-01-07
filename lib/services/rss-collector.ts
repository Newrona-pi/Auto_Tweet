import Parser from 'rss-parser';
import { prisma } from '@/lib/prisma';

const parser = new Parser();

export interface CollectionResult {
    newItems: number;
    totalProcessed: number;
    errors: string[];
}

export async function collectRSSFeeds(): Promise<CollectionResult> {
    const sources = await prisma.source.findMany({
        where: { enabled: true, type: 'rss' },
    });

    let newItems = 0;
    let totalProcessed = 0;
    const errors: string[] = [];

    console.log(`📡 Collecting from ${sources.length} RSS feeds...`);

    for (const source of sources) {
        try {
            console.log(`  Fetching: ${source.name}`);
            const feed = await parser.parseURL(source.url);

            for (const item of feed.items) {
                totalProcessed++;

                if (!item.link || !item.title) {
                    continue; // Skip items without required fields
                }

                // Check if item already exists
                const existing = await prisma.item.findUnique({
                    where: { url: item.link },
                });

                if (existing) {
                    continue; // Skip duplicates
                }

                // Create new item (metadata only, NO full text)
                await prisma.item.create({
                    data: {
                        sourceId: source.id,
                        title: item.title,
                        url: item.link,
                        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
                        description: item.contentSnippet?.substring(0, 500) || item.content?.substring(0, 500),
                        imageUrl: item.enclosure?.url || null,
                        attentionScore: 0, // Will be calculated during clustering
                    },
                });

                newItems++;
            }

            console.log(`  ✓ ${source.name}: processed ${feed.items.length} items`);
        } catch (error) {
            const errorMsg = `Failed to fetch ${source.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            console.error(`  ✗ ${errorMsg}`);
            errors.push(errorMsg);
        }
    }

    console.log(`✅ Collection complete: ${newItems} new items (${totalProcessed} total processed)`);

    return {
        newItems,
        totalProcessed,
        errors,
    };
}
