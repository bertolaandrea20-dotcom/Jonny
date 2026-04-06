import ChatClient from './client';
import { MOCK_SWIPE_PROFESSIONALS, MOCK_CONVERSATIONS } from '@/lib/mock-data';

export function generateStaticParams() {
  // Generate pages for existing conversations + new conversations from swipe
  const convIds = MOCK_CONVERSATIONS.map((c: any) => ({ id: c.id }));
  const newIds = MOCK_SWIPE_PROFESSIONALS.map((p: any) => ({ id: `new-${p.profileId}` }));
  return [...convIds, ...newIds];
}

export default function ChatPage({ params }: { params: { id: string } }) {
  return <ChatClient conversationId={params.id} />;
}
