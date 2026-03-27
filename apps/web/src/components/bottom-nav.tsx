'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Calendar, User, Briefcase } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { clsx } from 'clsx';

const clientLinks = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/search', icon: Search, label: 'Search' },
  { href: '/jobs', icon: Briefcase, label: 'Jobs' },
  { href: '/bookings', icon: Calendar, label: 'Bookings' },
  { href: '/profile', icon: User, label: 'Profile' },
];

const proLinks = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/dashboard', icon: Calendar, label: 'Requests' },
  { href: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
    return null;
  }

  if (!user) return null;

  const links = user.role === 'PROFESSIONAL' ? proLinks : clientLinks;

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-50">
      <div className="max-w-lg mx-auto">
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg shadow-gray-900/10 border border-white/50 flex justify-around items-center py-2 px-2">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  'flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all duration-200',
                  isActive
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-400 hover:text-gray-600',
                )}
              >
                <link.icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className={clsx(
                  'text-[10px]',
                  isActive ? 'font-semibold' : 'font-medium',
                )}>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
