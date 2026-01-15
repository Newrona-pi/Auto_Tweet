import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Prismaクライアントのパスは環境に合わせて調整してください

export const dynamic = 'force-dynamic'; // キャッシュ無効化

export async function GET(request: Request) {
    try {
        // 1. URLパラメータから 'key' を取得
        // const { searchParams } = new URL(request.url);
        // const apiKey = searchParams.get('key');

        // 2. 認証チェック (DEBUG: TEMPORARILY DISABLED)
        // if (apiKey !== process.env.FEED_API_KEY) {
        //     console.error('Auth Failed. Received:', apiKey);
        //     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        // }

        // 3. データ取得 (最新2時間以内)
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

        const drafts = await prisma.draftPost.findMany({
            where: {
                posted: false,
                createdAt: {
                    gte: twoHoursAgo,
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 10,
            include: {
                summary: {
                    include: {
                        topic: {
                            include: {
                                items: {
                                    take: 1,
                                    orderBy: { attentionScore: 'desc' }
                                },
                            },
                        },
                    },
                },
            },
        });

        // 4. 整形して返す
        const responseData = drafts.map((draft) => {
            // 階層が深いので安全に取得
            // Note: In Prisma schema, Topic has many Items (items[]), not single item.
            // So we take the first item from the array we fetched.
            const items = draft.summary?.topic?.items;
            const sourceUrl = (items && items.length > 0) ? items[0].url : "";

            return {
                id: draft.id,
                content: draft.content,
                source_url: sourceUrl,
                created_at: draft.createdAt,
            };
        });

        return NextResponse.json(responseData);

    } catch (error) {
        console.error('Feed API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
