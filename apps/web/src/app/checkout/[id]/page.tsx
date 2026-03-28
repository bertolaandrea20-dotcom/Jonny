import CheckoutClient from './client';

export function generateStaticParams() {
  return [
    { id: 'booking-1' },
    { id: 'booking-2' },
    { id: 'booking-3' },
  ];
}

export default function CheckoutPage({ params }: { params: { id: string } }) {
  return <CheckoutClient bookingId={params.id} />;
}
