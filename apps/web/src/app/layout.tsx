import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { Toaster } from '@/components/ui/toaster';
import '@/styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'myVote Kenya',
    template: '%s | myVote Kenya',
  },
  description: 'Kenya\'s premier election management platform. Follow candidates, participate in polls, track election results, and stay informed about electoral activities.',
  keywords: [
    'Kenya',
    'elections',
    'voting',
    'candidates',
    'polls',
    'IEBC',
    'politics',
    'democracy',
  ],
  authors: [{ name: 'myVote Kenya Team' }],
  creator: 'myVote Kenya',
  publisher: 'myVote Kenya',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    url: 'https://myvote.ke',
    title: 'myVote Kenya',
    description: 'Kenya\'s premier election management platform',
    siteName: 'myVote Kenya',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'myVote Kenya',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'myVote Kenya',
    description: 'Kenya\'s premier election management platform',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#22c55e' },
    { media: '(prefers-color-scheme: dark)', color: '#1e3a2f' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
