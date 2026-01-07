import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';

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

    // Get topics ordered by highest attention score
    const topics = await prisma.topic.findMany({
        include: {
            items: {
                orderBy: { attentionScore: 'desc' },
                take: 10, // Max 10 items per topic
            },
            summaries: true,
        },
        orderBy: {
            clusteredAt: 'desc',
        },
        take: topCount,
    });

    // Filter out topics that already have summaries
    const topicsToSummarize = topics.filter((topic) => topic.summaries.length === 0);

    if (topicsToSummarize.length === 0) {
        console.log('  No topics need summarization');
        return { summariesCreated: 0, draftsCreated: 0 };
    }

    console.log(`  Found ${topicsToSummarize.length} topics to summarize`);

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
                        content: `あなたはX（旧Twitter）用の投稿を作成する専門家です。AIや半導体業界のニュースを、興味を引く形で80〜140文字以内にまとめてください。`,
                    },
                    {
                        role: 'user',
                        content: `以下の要約から、X投稿用のテキストを生成してください：

要約: ${summaryData.japaneseSummary}
なぜ注目: ${summaryData.whyHot}

制約:
- **必ず80文字以上、140文字以内**にしてください（空白・句読点を含む）
- 興味を引く書き出しにしてください
- ハッシュタグは不要です
- 絵文字は適度に使用してください

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
                console.warn(`  ⚠ Draft too short (${draftContent.length} chars), regenerating...`);
                // Truncate the summary for a shorter prompt
                const shortSummary = summaryData.japaneseSummary.substring(0, 100);
                draftContent = `🚨 ${topic.name}の最新動向: ${shortSummary}...`;
            }

            if (draftContent.length > 140) {
                console.warn(`  ⚠ Draft too long (${draftContent.length} chars), truncating...`);
                draftContent = draftContent.substring(0, 137) + '...';
            }

            // Create draft post
            await prisma.draftPost.create({
                data: {
                    summaryId: summary.id,
                    content: draftContent,
                },
            });

            draftsCreated++;
            console.log(`  ✓ Created X draft (${draftContent.length} chars)`);
        } catch (error) {
            console.error(`  ✗ Failed to summarize topic ${topic.name}:`, error);
        }
    }

    console.log(`✅ Summarization complete: ${summariesCreated} summaries, ${draftsCreated} drafts`);

    return {
        summariesCreated,
        draftsCreated,
    };
}
