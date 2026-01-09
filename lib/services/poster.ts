import { TwitterApi } from 'twitter-api-v2';

export async function postToX(content: string) {
    console.log('🚀 Posting to X...');

    const client = new TwitterApi({
        appKey: process.env.TWITTER_API_KEY!,
        appSecret: process.env.TWITTER_API_SECRET!,
        accessToken: process.env.TWITTER_ACCESS_TOKEN!,
        accessSecret: process.env.TWITTER_ACCESS_SECRET!,
    });

    try {
        const rwClient = client.readWrite;
        const response = await rwClient.v2.tweet(content);
        console.log('✅ Posted successfully:', response.data.id);
        return { success: true, id: response.data.id };
    } catch (error) {
        console.error('❌ Failed to post to X:', error);
        return { success: false, error };
    }
}
