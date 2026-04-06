import CheckoutClient from './client';
import { MOCK_CLIENT_BOOKINGS } from '@/lib/mock-data';

export function generateStaticParams() {
  return MOCK_CLIENT_BOOKINGS.map((b: any) => ({ id: b.id }));
}

export default function CheckoutPage({ params }: { params: { id: string } }) {
  return <CheckoutClient bookingId={params.id} />;
}
