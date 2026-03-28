'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { PageLoading } from '@/components/loading-spinner';
import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from '@/lib/mock-data';
import { ArrowLeft, Send, Phone, MoreVertical } from 'lucide-react';
import { Avatar } from '@/components/avatar';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [messages, setMessages] = useState<{ id: string; text: string; sent: boolean; timestamp: string }[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const conv = MOCK_CONVERSATIONS.find((c) => c.id === conversationId);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (conversationId && MOCK_MESSAGES[conversationId]) {
      setMessages([...MOCK_MESSAGES[conversationId]]);
    }
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  if (loading || !user) return <PageLoading />;
  if (!conv) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-400">Conversazione non trovata</p>
      </div>
    );
  }

  const handleSend = () => {
    if (!input.trim()) return;
    const newMsg = {
      id: `msg-new-${Date.now()}`,
      text: input.trim(),
      sent: true,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput('');

    // Simulate auto-reply after 1.5s
    setTimeout(() => {
      const replies = [
        'Ricevuto! Grazie 😊',
        'Perfetto, nessun problema!',
        'Ok, ci sentiamo presto!',
        'Va benissimo, grazie per il messaggio!',
        'Capisco, ne parliamo alla prossima!',
      ];
      const autoReply = {
        id: `msg-auto-${Date.now()}`,
        text: replies[Math.floor(Math.random() * replies.length)],
        sent: false,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, autoReply]);
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
        <Avatar src={conv.recipientAvatar} name={conv.recipientName} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{conv.recipientName}</p>
          <p className="text-[10px] text-emerald-500 font-medium">Online</p>
        </div>
        <button className="text-gray-400 hover:text-gray-600 p-1">
          <Phone size={18} />
        </button>
        <button className="text-gray-400 hover:text-gray-600 p-1">
          <MoreVertical size={18} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.map((msg) => {
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
        })}
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
            disabled={!input.trim()}
            className="w-11 h-11 rounded-full bg-primary-500 text-white flex items-center justify-center disabled:opacity-40 hover:bg-primary-600 transition-colors shadow-md shadow-primary-200"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
