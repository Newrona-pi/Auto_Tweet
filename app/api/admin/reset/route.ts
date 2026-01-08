import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST() {
    try {
        // Delete drafts first (due to foreign key constraints), then summaries.
        // We keep Items and Topics so we can re-summarize them.
        await prisma.draftPost.deleteMany({});
        await prisma.summary.deleteMany({});

        return NextResponse.json({ success: true, message: 'Summaries and drafts have been reset.' });
    } catch (error) {
        console.error('Reset error:', error);
        return NextResponse.json({ error: 'Failed to reset data' }, { status: 500 });
    }
}
