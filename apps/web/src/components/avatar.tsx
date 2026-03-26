'use client';

import { clsx } from 'clsx';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-24 h-24 text-2xl',
};

const colors = [
  'bg-primary-500', 'bg-amber-500', 'bg-orange-500',
  'bg-rose-500', 'bg-red-400', 'bg-yellow-600',
];

export function Avatar({ src, name, size = 'md' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const colorIndex = name.charCodeAt(0) % colors.length;

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={clsx('rounded-full object-cover', sizeClasses[size])}
      />
    );
  }

  return (
    <div
      className={clsx(
        'rounded-full flex items-center justify-center text-white font-semibold',
        sizeClasses[size],
        colors[colorIndex],
      )}
    >
      {initials}
    </div>
  );
}
