const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function getJstHour(dateUtc: Date): number {
    const j = new Date(dateUtc.getTime() + JST_OFFSET_MS);
    return j.getUTCHours();
}

function isSleepWindowJst(dateUtc: Date): boolean {
    const h = getJstHour(dateUtc);
    return h >= 23 || h < 7;
}

function next0700JstUtc(fromUtc: Date): Date {
    const j = new Date(fromUtc.getTime() + JST_OFFSET_MS);
    const y = j.getUTCFullYear();
    const m = j.getUTCMonth();
    const d = j.getUTCDate();
    const h = j.getUTCHours();
    const dayOffset = h >= 23 ? 1 : 0;
    const targetJst = new Date(Date.UTC(y, m, d + dayOffset, 7, 0, 0));
    return new Date(targetJst.getTime() - JST_OFFSET_MS);
}

export function computeImpactScoreFromItems(
    items: Array<{ attentionScore: number; url: string }>
): { impactScore: number; sourceUrl: string } {
    if (!items || items.length === 0) return { impactScore: 0, sourceUrl: '' };

    let best = items[0];
    for (const it of items) {
        if ((it.attentionScore ?? 0) > (best.attentionScore ?? 0)) best = it;
    }
    const score = Math.max(0, Math.min(100, Math.round((best.attentionScore ?? 0) * 100)));
    return { impactScore: score, sourceUrl: best.url || '' };
}

/**
 * Bible v3.3:
 * S>=90: +2h (Sleep Carry-Over: if createdAt in sleep window JST, extend to next 07:00 JST +2h)
 * A>=70: +6h
 * B>=40: +18h
 */
export function computeNotAfter(createdAt: Date, impactScore: number): Date {
    if (impactScore >= 90) {
        const base = addHours(createdAt, 2);
        if (isSleepWindowJst(createdAt)) {
            const carry = addHours(next0700JstUtc(createdAt), 2);
            return carry.getTime() > base.getTime() ? carry : base;
        }
        return base;
    }
    if (impactScore >= 70) return addHours(createdAt, 6);
    if (impactScore >= 40) return addHours(createdAt, 18);
    return addHours(createdAt, 2);
}
