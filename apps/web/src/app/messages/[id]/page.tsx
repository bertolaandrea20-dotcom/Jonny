import ChatClient from './client';

export const dynamic = 'force-dynamic';

export default function ChatPage({ params }: { params: { id: string } }) {
  return <ChatClient conversationId={params.id} />;
}
