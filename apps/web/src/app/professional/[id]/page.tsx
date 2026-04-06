import ProfessionalProfilePage from './client';
import { MOCK_SWIPE_PROFESSIONALS } from '@/lib/mock-data';

export function generateStaticParams() {
  return MOCK_SWIPE_PROFESSIONALS.map((p) => ({ id: p.profileId }));
}

export default function Page() {
  return <ProfessionalProfilePage />;
}
