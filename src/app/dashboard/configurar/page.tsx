import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import ConfigurarPageContent from '@/components/configuration/ConfigurarPageContent';

const ALLOWED_EMAIL = 'deivisadames@gmail.com';

export default async function ConfigurarPage() {
  const session = await auth();
  const userEmail = session?.user?.email?.trim().toLowerCase();

  if (userEmail !== ALLOWED_EMAIL) {
    redirect('/dashboard/aprender');
  }

  return <ConfigurarPageContent />;
}
