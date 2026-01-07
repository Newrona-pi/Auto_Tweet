import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Admin - Auto_Tweet',
    description: 'AI News Aggregation Admin Dashboard',
    robots: 'noindex, nofollow', // Prevent search engine indexing
};

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Note: Admin authentication is disabled (ENABLE_ADMIN_AUTH=false)
    // Future implementation: Check ENABLE_ADMIN_AUTH env var and require password if true

    return <>{children}</>;
}
