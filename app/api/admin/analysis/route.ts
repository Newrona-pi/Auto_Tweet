import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
    try {
        // 1. Fetch Topics with aggregated stats
        const topics = await prisma.topic.findMany({
            include: {
                _count: {
                    select: { items: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 20
        });

        // 2. Fetch Recent Items
        const items = await prisma.item.findMany({
            orderBy: {
                publishedAt: 'desc'
            },
            take: 100,
            include: {
                source: {
                    select: { name: true }
                },
                topics: {
                    include: {
                        topic: true
                    }
                }
            }
        });

        return NextResponse.json({
            topics: topics.map(t => ({
                id: t.id,
                name: t.name,
                itemCount: t._count.items,
                createdAt: t.createdAt
            })),
            items: items.map(i => ({
                id: i.id,
                title: i.title,
                url: i.url,
                source: i.source.name,
                publishedAt: i.publishedAt,
                topics: i.topics.map(ti => ti.topic.name).join(', ')
            }))
        });

    } catch (error) {
        console.error('Analysis API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch analysis data' }, { status: 500 });
    }
}
