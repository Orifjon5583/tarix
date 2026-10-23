import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Xotiralarim — Shaxsiy Xotiralar va Muhim Sanalar',
  description: 'Shaxsiy xotiralar, fotosuratlar, kundalik va kelajak xatlari arxivi',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Xotiralarim',
  },
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#09090b',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz" className="dark">
      <body className="bg-[#09090b] text-foreground min-h-screen antialiased selection:bg-violet-600/30 selection:text-violet-200">
        {children}
      </body>
    </html>
  );
}
