import ChatClient from './client';

export function generateStaticParams() {
  return [
    { id: 'conv-1' },
    { id: 'conv-2' },
    { id: 'conv-3' },
    { id: 'conv-4' },
  ];
}

export default function ChatPage({ params }: { params: { id: string } }) {
  return <ChatClient conversationId={params.id} />;
}
