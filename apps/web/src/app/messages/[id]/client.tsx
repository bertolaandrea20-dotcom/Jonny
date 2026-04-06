'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { PageLoading } from '@/components/loading-spinner';
import { ArrowLeft, Send, AlertTriangle, X, Flag } from 'lucide-react';
import { Avatar } from '@/components/avatar';
import { motion } from 'framer-motion';

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function formatDateSeparator(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Oggi';
  if (diffDays === 1) return 'Ieri';
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
}

export default function ChatClient({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [partnerInfo, setPartnerInfo] = useState<{ name: string; avatar?: string } | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showPrivacyBanner, setShowPrivacyBanner] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const partnerId = conversationId;

  const loadMessages = useCallback(async () => {
    if (!user) return;
    try {
      const msgs = await api.getMessages(partnerId);
      setMessages(msgs);
      // Extract partner info from first received message
      if (msgs.length > 0 && !partnerInfo) {
        const received = msgs.find((m: any) => !m.sent);
        if (received) {
          setPartnerInfo({ name: received.senderName });
        }
      }
    } catch {
      // Silently fail on polling
    }
  }, [user, partnerId, partnerInfo]);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  // Initial load + mark as read
  useEffect(() => {
    if (!user) return;
    setLoadingMessages(true);
    Promise.all([
      api.getMessages(partnerId),
      api.markAsRead(partnerId),
    ])
      .then(([msgs]) => {
        setMessages(msgs);
        if (msgs.length > 0) {
          const received = msgs.find((m: any) => !m.sent);
          if (received) {
            setPartnerInfo({ name: received.senderName });
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingMessages(false));
  }, [user, partnerId]);

  // Polling for new messages every 5 seconds
  useEffect(() => {
    if (!user) return;
    pollingRef.current = setInterval(() => {
      loadMessages();
      api.markAsRead(partnerId).catch(() => {});
    }, 5000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [user, partnerId, loadMessages]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  if (loading || !user) return <PageLoading />;

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    // Optimistic add
    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      text,
      sent: true,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const saved = await api.sendMessage(partnerId, text);
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticMsg.id ? saved : m))
      );
    } catch {
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  // Group messages by date
  let lastDate = '';

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 flex items-center gap-3 shadow-sm">
        <button onClick={() => router.push('/messages')} className="text-gray-500 hover:text-gray-700 p-1">
          <ArrowLeft size={22} />
        </button>
        <Avatar src={partnerInfo?.avatar} name={partnerInfo?.name || 'Utente'} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{partnerInfo?.name || 'Conversazione'}</p>
        </div>
        <button
          onClick={() => alert('Funzione di segnalazione in arrivo')}
          className="text-gray-400 hover:text-red-500 p-1"
          title="Segnala"
        >
          <Flag size={18} />
        </button>
      </div>

      {/* Privacy Banner */}
      {showPrivacyBanner && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-start gap-2">
          <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs text-amber-800 leading-relaxed">
              Per la tua sicurezza, non condividere informazioni personali (numero di telefono, email, indirizzo).
              Ogni violazione pu&ograve; essere segnalata.
            </p>
          </div>
          <button onClick={() => setShowPrivacyBanner(false)} className="text-amber-400 hover:text-amber-600 flex-shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {loadingMessages ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">Nessun messaggio</p>
            <p className="text-gray-300 text-xs mt-1">Inizia la conversazione!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const msgDate = formatDateSeparator(msg.timestamp);
            let showDate = false;
            if (msgDate !== lastDate) {
              showDate = true;
              lastDate = msgDate;
            }

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex justify-center my-3">
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                      {msgDate}
                    </span>
                  </div>
                )}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className={`flex ${msg.sent ? 'justify-end' : 'justify-start'} mb-1`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                      msg.sent
                        ? 'bg-primary-500 text-white rounded-br-md'
                        : 'bg-white text-gray-800 rounded-bl-md shadow-sm border border-gray-100'
                    }`}
                  >
                    <p className="leading-relaxed">{msg.text}</p>
                    <p className={`text-[9px] mt-1 text-right ${msg.sent ? 'text-white/60' : 'text-gray-300'}`}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </motion.div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 pb-safe">
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Scrivi un messaggio..."
            className="flex-1 bg-gray-50 rounded-2xl px-4 py-3 text-sm border border-gray-100 focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-11 h-11 rounded-full bg-primary-500 text-white flex items-center justify-center disabled:opacity-40 hover:bg-primary-600 transition-colors shadow-md shadow-primary-200"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
