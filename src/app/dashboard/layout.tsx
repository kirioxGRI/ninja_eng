import type { Metadata } from 'next';
import { getActiveUser } from '@/app/actions/user-actions';
import Sidebar from '@/components/layout/Sidebar';

export const metadata: Metadata = {
  title: 'NinjaEng – Dashboard',
  description: 'Aprende vocabulario en inglés con pronunciación, oraciones y exámenes.',
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getActiveUser();

  return (
    <div className="app-layout">
      <Sidebar userName={user?.nombre} />
      <div className="main-content">
        {children}
      </div>
    </div>
  );
}
