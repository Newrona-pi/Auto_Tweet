import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'; // Ensure no caching

export async function GET(request: NextRequest) {
    try {
        // 1. Authentication (Header Key Check)
        const apiKey = request.headers.get('x-feed-key');
        const envKey = process.env.FEED_API_KEY;

        if (!envKey) {
            console.error('SERVER CONFIG ERROR: FEED_API_KEY is not set');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        if (apiKey !== envKey) {
            console.warn('Unauthorized feed access attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Data Retrieval
        // Fetch pending drafts (posted: false)
        // Need to traverse relations to get the original source URL
        const drafts = await prisma.draftPost.findMany({
            where: {
                posted: false
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 10,
            include: {
                summary: {
                    include: {
                        topic: {
                            include: {
                                items: {
                                    orderBy: { attentionScore: 'desc' }, // Get main article
                                    take: 1
                                }
                            }
                        }
                    }
                }
            }
        });

        // 3. Transform to required JSON format
        const responseData = drafts.map(draft => {
            // Extract URL from the most relevant item in the topic
            const items = draft.summary.topic.items;
            const sourceUrl = items.length > 0 ? items[0].url : '';

            return {
                id: draft.id,
                content: draft.content,
                source_url: sourceUrl,
                created_at: draft.createdAt.toISOString()
            };
        });

        return NextResponse.json(responseData);

    } catch (error) {
        console.error('Feed API Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
