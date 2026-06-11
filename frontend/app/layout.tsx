import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

/** Metadata SEO default untuk seluruh aplikasi */
export const metadata: Metadata = {
  title: {
    default: 'JalanRusak - Laporkan Jalan Rusak di Sekitar Anda',
    template: '%s | JalanRusak',
  },
  description: 'Platform pelaporan jalan rusak berbasis komunitas. Laporkan, pantau, dan bantu perbaiki infrastruktur jalan di kota Anda.',
  keywords: ['jalan rusak', 'pelaporan', 'infrastruktur', 'kota'],
};

/**
 * Root layout — membungkus seluruh aplikasi.
 * Di sinilah font, metadata, dan provider global dipasang.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
