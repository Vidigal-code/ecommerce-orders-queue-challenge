import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});
const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Orders Queue Dashboard | E-commerce VIP Processing",
    description: "Monitor and control a high-volume prioritized (VIP → NORMAL) order pipeline.",
    keywords: ["ecommerce", "queue", "redis", "bull", "priority", "VIP", "NestJS", "Next.js"],
    openGraph: {
        title: "Orders Queue Dashboard",
        description: "High-scale VIP→NORMAL order processing monitoring.",
        type: "website",
        url: "https://example.com"
    },
    twitter: {
        card: "summary_large_image",
        title: "Orders Queue Dashboard",
        description: "Monitor prioritized order processing."
    }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "E-commerce Orders Queue Dashboard",
        applicationCategory: "BusinessApplication",
        description: "Dashboard for monitoring prioritized order generation and processing."
    };

    return (
        <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-neutral-950 text-neutral-100`}>
        <script
            type="application/ld+json"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl font-bold tracking-tight">Orders Queue Dashboard</h1>
                <nav className="flex gap-4 text-sm">
                    <a href="/" className="hover:underline">Dashboard</a>
                    <a href="/logs" className="hover:underline">Logs</a>
                    <a href="/queue" className="hover:underline">Queue</a>
                    <a href="/runs" className="hover:underline">Runs</a>
                </nav>
            </header>
            {children}
            <footer className="py-10 text-center text-xs text-neutral-600">
                &copy; {new Date().getFullYear()} Orders Queue Challenge
            </footer>
        </div>
        </body>
        </html>
    );
}