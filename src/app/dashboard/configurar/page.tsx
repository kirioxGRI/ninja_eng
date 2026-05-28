import { redirect } from 'next/navigation';

import { getUserForCurrentSession } from '@/app/actions/user-actions';
import ConfigurarPageContent from '@/components/configuration/ConfigurarPageContent';

const ALLOWED_EMAIL = 'deivisadames@gmail.com';

export default async function ConfigurarPage() {
  const user = await getUserForCurrentSession();
  const userEmail = user?.email?.trim().toLowerCase();

  if (userEmail !== ALLOWED_EMAIL || !user) {
    redirect('/dashboard/reading');
  }

  return <ConfigurarPageContent />;
}
