'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { MOCK_SWIPE_PROFESSIONALS } from '@/lib/mock-data';
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

// Resolve partner info from mock data for new-* conversations
function resolvePartner(conversationId: string): { id: string; name: string; avatar?: string } | null {
  if (conversationId.startsWith('new-')) {
    const proId = conversationId.replace('new-', '');
    const pro = MOCK_SWIPE_PROFESSIONALS.find((p) => p.profileId === proId);
    if (pro) {
      return { id: proId, name: `${pro.firstName} ${pro.lastName}`, avatar: pro.avatarUrl };
    }
  }
  return null;
}

const DEMO_REPLIES = [
  'Ricevuto! Grazie 😊',
  'Perfetto, nessun problema!',
  'Ok, ci sentiamo presto!',
  'Va benissimo, grazie per il messaggio!',
  'Capisco, ne parliamo alla prossima!',
  'Certo, dimmi pure quando preferisci!',
  'Ottimo! Ti confermo a breve.',
];

export default function ChatClient({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [partnerInfo, setPartnerInfo] = useState<{ name: string; avatar?: string } | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showPrivacyBanner, setShowPrivacyBanner] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isNewConversation = conversationId.startsWith('new-');
  const partnerId = isNewConversation ? conversationId.replace('new-', '') : conversationId;

  // Resolve partner info immediately for new conversations
  useEffect(() => {
    const resolved = resolvePartner(conversationId);
    if (resolved) {
      setPartnerInfo({ name: resolved.name, avatar: resolved.avatar });
    }
  }, [conversationId]);

  // Load messages
  useEffect(() => {
    if (isNewConversation) {
      // New conversation from swipe - start empty, demo mode
      setMessages([]);
      setLoadingMessages(false);
      setIsDemo(true);
      return;
    }

    // Try real API
    Promise.all([
      api.getMessages(partnerId).catch(() => null),
      api.markAsRead(partnerId).catch(() => null),
    ])
      .then(([msgs]) => {
        if (msgs && msgs.length > 0) {
          setMessages(msgs);
          const received = msgs.find((m: any) => !m.sent);
          if (received && !partnerInfo) {
            setPartnerInfo({ name: received.senderName });
          }
        } else {
          // API returned empty or failed - switch to demo
          setIsDemo(true);
        }
      })
      .catch(() => {
        setIsDemo(true);
      })
      .finally(() => setLoadingMessages(false));
  }, [partnerId, isNewConversation]);

  // Polling only if not demo
  useEffect(() => {
    if (isDemo || isNewConversation) return;
    pollingRef.current = setInterval(() => {
      api.getMessages(partnerId).then(setMessages).catch(() => {});
      api.markAsRead(partnerId).catch(() => {});
    }, 5000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [partnerId, isDemo, isNewConversation]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  if (loading) return <PageLoading />;

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    const newMsg = {
      id: `msg-${Date.now()}`,
      text,
      sent: true,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMsg]);

    if (!isDemo) {
      try {
        const saved = await api.sendMessage(partnerId, text);
        setMessages((prev) => prev.map((m) => (m.id === newMsg.id ? saved : m)));
        setSending(false);
        return;
      } catch {
        // Fall through to demo mode
        setIsDemo(true);
      }
    }

    // Demo mode: simulate auto-reply after 1.5s
    setSending(false);
    setTimeout(() => {
      const reply = {
        id: `msg-auto-${Date.now()}`,
        text: DEMO_REPLIES[Math.floor(Math.random() * DEMO_REPLIES.length)],
        sent: false,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, reply]);
    }, 1500);
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
          <p className="text-[10px] text-emerald-500 font-medium">Online</p>
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
            <p className="text-gray-300 text-xs mt-1">Inizia la conversazione con {partnerInfo?.name || 'questo professionista'}!</p>
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
