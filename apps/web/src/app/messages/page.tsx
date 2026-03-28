'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { PageLoading } from '@/components/loading-spinner';
import { MOCK_CONVERSATIONS } from '@/lib/mock-data';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { Avatar } from '@/components/avatar';
import { motion } from 'framer-motion';

function formatTimestamp(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 1) return 'Ora';
  if (mins < 60) return `${mins}m fa`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h fa`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Ieri';
  return `${days}g fa`;
}

export default function MessagesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading || !user) return <PageLoading />;

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="gradient-hero px-5 pt-14 pb-8 rounded-b-[2.5rem]">
        <div className="max-w-lg mx-auto">
          <button onClick={() => router.push('/')} className="text-white/80 mb-3 flex items-center gap-1 text-sm">
            <ArrowLeft size={18} /> Home
          </button>
          <div className="flex items-center gap-3">
            <MessageCircle size={28} className="text-white" />
            <div>
              <h1 className="text-2xl font-bold text-white">Messaggi</h1>
              <p className="text-white/70 text-sm">{MOCK_CONVERSATIONS.length} conversazioni</p>
            </div>
          </div>
        </div>
      </div>

      <div className="page-container -mt-4">
        {MOCK_CONVERSATIONS.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle size={48} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Nessun messaggio ancora</p>
            <p className="text-gray-300 text-xs mt-1">Le conversazioni con i professionisti appariranno qui</p>
          </div>
        ) : (
          <div className="space-y-2">
            {MOCK_CONVERSATIONS.map((conv, i) => (
              <motion.button
                key={conv.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => router.push(`/messages/${conv.id}`)}
                className="w-full card-elevated p-4 flex items-center gap-3 text-left hover:shadow-lg transition-all"
              >
                <div className="relative flex-shrink-0">
                  <Avatar src={conv.recipientAvatar} name={conv.recipientName} size="md" />
                  {conv.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`font-semibold text-sm ${conv.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                      {conv.recipientName}
                    </p>
                    <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                      {formatTimestamp(conv.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{conv.recipientRole}</p>
                  <p className={`text-xs mt-1 truncate ${conv.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                    {conv.lastMessage}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
