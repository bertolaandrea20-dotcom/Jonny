'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Calendar, User } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { clsx } from 'clsx';

const clientLinks = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/search', icon: Search, label: 'Search' },
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

  // Don't show nav on auth pages
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
    return null;
  }

  if (!user) return null;

  const links = user.role === 'PROFESSIONAL' ? proLinks : clientLinks;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50">
      <div className="max-w-lg mx-auto flex justify-around items-center py-2">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors',
                isActive ? 'text-primary-600 bg-primary-50 rounded-xl' : 'text-gray-400 hover:text-gray-600',
              )}
            >
              <link.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
