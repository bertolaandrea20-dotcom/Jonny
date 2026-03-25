import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { BottomNav } from '@/components/bottom-nav';

export const metadata: Metadata = {
  title: 'Jonny - Find Local Professionals',
  description: 'Connect with trusted local service professionals near you',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <main className="min-h-screen">
            {children}
          </main>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
