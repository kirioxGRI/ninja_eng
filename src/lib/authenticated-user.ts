import 'server-only';

import { cache } from 'react';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { normalizeEmail } from '@/lib/email';

export const getAuthenticatedUser = cache(async () => {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);

  if (!email) {
    return null;
  }

  return prisma.usuario.findUnique({
    where: { email },
  });
});

export async function requireAuthenticatedUser() {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error('Usuario autenticado no encontrado.');
  }

  return user;
}
