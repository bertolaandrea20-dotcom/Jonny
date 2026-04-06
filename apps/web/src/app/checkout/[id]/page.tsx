import CheckoutClient from './client';

export const dynamic = 'force-dynamic';

export default function CheckoutPage({ params }: { params: { id: string } }) {
  return <CheckoutClient bookingId={params.id} />;
}
