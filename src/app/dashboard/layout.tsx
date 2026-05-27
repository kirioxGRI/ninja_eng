import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
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
  const session = await auth();

  if (!session?.user?.email) {
    redirect('/login');
  }

  return (
    <div className="app-layout">
      <Sidebar userName={session.user.name ?? session.user.email} />
      <div className="main-content">
        {children}
      </div>
    </div>
  );
}
