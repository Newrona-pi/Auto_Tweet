/** @type {import('next').NextConfig} */
const nextConfig = {
    async headers() {
        return [
            {
                source: '/admin/:path*',
                headers: [
                    {
                        key: 'X-Robots-Tag',
                        value: 'noindex, nofollow',
                    },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
