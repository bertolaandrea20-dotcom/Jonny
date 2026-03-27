'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Eye, EyeOff, User, Briefcase } from 'lucide-react';
import { clsx } from 'clsx';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [role, setRole] = useState<'CLIENT' | 'PROFESSIONAL'>('CLIENT');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register({ email, password, firstName, lastName, role });
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top gradient */}
      <div className="gradient-hero h-36 rounded-b-[3rem] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent)]" />
        <div className="text-center relative">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Service to U</h1>
          <p className="text-white/80 text-sm mt-1 font-medium">Create your account</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-6 -mt-6">
        <div className="max-w-sm mx-auto w-full">
          <div className="card-elevated p-6">
            {/* Role selector */}
            <div className="flex gap-3 mb-6">
              <button
                type="button"
                onClick={() => setRole('CLIENT')}
                className={clsx(
                  'flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all duration-200',
                  role === 'CLIENT'
                    ? 'border-primary-400 bg-primary-50 text-primary-700 shadow-sm'
                    : 'border-gray-100 text-gray-400 hover:border-gray-200',
                )}
              >
                <User size={24} />
                <span className="text-xs font-semibold">I need a service</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('PROFESSIONAL')}
                className={clsx(
                  'flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all duration-200',
                  role === 'PROFESSIONAL'
                    ? 'border-accent-400 bg-accent-50 text-accent-700 shadow-sm'
                    : 'border-gray-100 text-gray-400 hover:border-gray-200',
                )}
              >
                <Briefcase size={24} />
                <span className="text-xs font-semibold">I offer services</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">First name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="input-field"
                    placeholder="John"
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Last name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="input-field"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pr-12"
                    placeholder="Min. 8 characters"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl border border-red-100">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={clsx(
                  'w-full font-semibold py-3.5 px-6 rounded-2xl transition-all active:scale-[0.97]',
                  role === 'PROFESSIONAL' ? 'btn-accent' : 'btn-primary',
                )}
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-primary-600 font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
