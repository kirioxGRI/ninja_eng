import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getUserForCurrentSession } from '@/app/actions/user-actions';
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
  const user = await getUserForCurrentSession();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="app-layout">
      <Sidebar userName={user.nombre || user.email || undefined} />
      <div className="main-content">
        {children}
      </div>
    </div>
  );
}
