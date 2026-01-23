import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';
import { computeImpactScoreFromItems, computeNotAfter } from '@/lib/services/draft-scoring';
import { DraftState } from '@prisma/client';

// Lazy initialization of OpenAI client
function getOpenAIClient() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not defined');
    }
    return new OpenAI({
        apiKey: apiKey,
    });
}

export interface SummarizationResult {
    summariesCreated: number;
    draftsCreated: number;
}

export async function summarizeTopics(topCount: number = 5): Promise<SummarizationResult> {
    console.log(`📝 Summarizing top ${topCount} topics...`);

    // Get topics ordered by highest attention score that haven't been summarized yet
    // Fetch more candidates (20) to sort by "freshness" (latest article date) in memory
    const candidateTopics = await prisma.topic.findMany({
        where: {
            summaries: {
                none: {}
            }
        },
        include: {
            items: {
                orderBy: { publishedAt: 'desc' }, // Get newest items first to easily check freshness
                take: 10,
            },
            summaries: true,
        },
        orderBy: {
            clusteredAt: 'desc',
        },
        take: 20, // Look at recent 20 batches
    });

    // Sort candidates by the date of their NEWEST item
    const sortedTopics = candidateTopics.sort((a, b) => {
        const aLatest = a.items.length > 0 ? new Date(a.items[0].publishedAt).getTime() : 0;
        const bLatest = b.items.length > 0 ? new Date(b.items[0].publishedAt).getTime() : 0;
        return bLatest - aLatest; // Newest first
    });

    // [NEW] Fetch recent context (last 5 summaries) to provide continuity
    const pastSummaries = await prisma.summary.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { topic: { select: { name: true } } }
    });

    // Format context for the LLM
    const contextText = pastSummaries.length > 0
        ? pastSummaries.map(s => `- [${new Date(s.createdAt).toLocaleDateString('ja-JP')}] ${s.topic.name}: ${s.japaneseSummary.substring(0, 50)}...`).join('\n')
        : "過去の履歴なし";

    // Take top N
    const topicsToSummarize = sortedTopics.slice(0, topCount);

    if (topicsToSummarize.length === 0) {
        console.log('  No topics need summarization');
        return { summariesCreated: 0, draftsCreated: 0 };
    }

    console.log(`  Found ${topicsToSummarize.length} topics to summarize (prioritizing fresh content)`);
    console.log(`  Context loaded: ${pastSummaries.length} past items`);

    let summariesCreated = 0;
    let draftsCreated = 0;

    for (const topic of topicsToSummarize) {
        try {
            // Prepare context from items
            const articlesContext = topic.items
                .map(
                    (item, idx) =>
                        `${idx + 1}. ${item.title}\n   URL: ${item.url}\n   Published: ${item.publishedAt.toISOString()}`
                )
                .join('\n\n');

            console.log(`  Generating summary for topic: ${topic.name}`);

            // Generate Japanese summary and "why it's hot" explanation
            const summaryResponse = await getOpenAIClient().chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: `あなたは AI・半導体業界の最新ニュースを分析する専門家です。複数の関連記事から、重要なポイントを抽出し、日本語で簡潔にまとめてください。`,
                    },
                    {
                        role: 'user',
                        content: `以下の記事群をまとめて、以下の2つを生成してください：

1. **日本語要約**（200字程度）:記事の主要なポイントをまとめてください。
2. **なぜ注目？**（150字程度）: このニュースがなぜ重要なのか、業界への影響を説明してください。

記事:
${articlesContext}

JSONフォーマットで回答してください：
{
  "japaneseSummary": "...",
  "whyHot": "..."
}`,
                    },
                ],
                response_format: { type: 'json_object' },
                temperature: 0.7,
            });

            const summaryData = JSON.parse(
                summaryResponse.choices[0].message.content || '{}'
            );

            // Create summary
            const summary = await prisma.summary.create({
                data: {
                    topicId: topic.id,
                    japaneseSummary: summaryData.japaneseSummary || '',
                    whyHot: summaryData.whyHot || '',
                },
            });

            summariesCreated++;
            console.log(`  ✓ Created summary for topic: ${topic.name}`);

            // Generate X draft (80-140 characters)
            console.log(`  Generating X draft...`);

            const draftResponse = await getOpenAIClient().chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: `あなたは熱狂的なAIエンジニアです。最新のAI・半導体技術ニュースに興奮している様子で、X（旧Twitter）用の投稿を作成してください。

【直近の技術トレンド・文脈】:
${contextText}

上記の文脈を（もし関連があれば）踏まえつつ、以下の新しいニュースについて投稿を作成してください。`,
                    },
                    {
                        role: 'user',
                        content: `以下の要約から、フォロワー（技術者）に向けたX投稿用テキストを生成してください：

要約: ${summaryData.japaneseSummary}
なぜ注目: ${summaryData.whyHot}

制約:
- **必ず80文字以上、140文字以内**にしてください
- **文体**: 「〜です」「〜ます」「〜だ」「〜である」調は禁止。「〜だよね」「〜がすごい！」「〜に注目」などの**口語体（タメ口に近い親しみやすさ）**を使用してください
- **トーン**: 驚き、興奮、技術への期待感を表現してください
- ハッシュタグは不要です
- 絵文字を文頭や文脈に合わせて2〜3個使用してください（🤖, 🚀, ⚡, 🤯 など）

JSON形式で回答してください：
{
  "content": "投稿テキスト（80-140文字）"
}`,
                    },
                ],
                response_format: { type: 'json_object' },
                temperature: 0.8,
            });

            const draftData = JSON.parse(draftResponse.choices[0].message.content || '{}');
            let draftContent = draftData.content || '';

            // Enforce 80-140 character limit
            if (draftContent.length < 80) {
                console.warn(`  ⚠ Draft too short(${draftContent.length} chars), regenerating...`);
                // Truncate the summary for a shorter prompt
                const shortSummary = summaryData.japaneseSummary.substring(0, 100);
                draftContent = `🚨 ${topic.name}の最新動向: ${shortSummary}...`;
            }

            if (draftContent.length > 140) {
                console.warn(`  ⚠ Draft too long(${draftContent.length} chars), truncating...`);
                draftContent = draftContent.substring(0, 137) + '...';
            }

            // Create draft post
            // Create draft post
            const { impactScore, sourceUrl } = computeImpactScoreFromItems(
                topic.items.map((it) => ({ attentionScore: it.attentionScore ?? 0, url: it.url }))
            );

            // Skip C-class (<40)
            if (impactScore < 40) {
                console.log(`  ⚠ impactScore ${impactScore} too low, skipping draft.`);
                continue;
            }

            const createdAt = new Date();
            const notAfter = computeNotAfter(createdAt, impactScore);

            await prisma.draftPost.create({
                data: {
                    summaryId: summary.id,
                    content: draftContent,
                    state: DraftState.NEW,
                    impactScore,
                    notAfter,
                    sourceUrl,
                    posted: false,
                },
            });

            draftsCreated++;
            console.log(`  ✓ Created X draft(${draftContent.length} chars)`);
        } catch (error) {
            console.error(`  ✗ Failed to summarize topic ${topic.name}: `, error);
        }
    }

    console.log(`✅ Summarization complete: ${summariesCreated} summaries, ${draftsCreated} drafts`);

    return {
        summariesCreated,
        draftsCreated,
    };
}
