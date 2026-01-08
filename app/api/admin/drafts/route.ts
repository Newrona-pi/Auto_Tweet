import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const drafts = await prisma.draftPost.findMany({
            include: {
                summary: {
                    include: {
                        topic: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 20
        });
        return NextResponse.json(drafts);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 });
    }
}
