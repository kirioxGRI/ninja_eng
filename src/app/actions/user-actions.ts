'use server';

import { prisma } from '@/lib/prisma';
import { cache } from 'react';

export const getActiveUser = cache(async () => {
  try {
    const user = await prisma.usuario.findFirst({
      orderBy: { id: 'asc' },
    });
    return user;
  } catch {
    return null;
  }
});

export async function createUser(nombre: string) {
  if (!nombre || nombre.trim().length === 0) {
    return { error: 'El nombre es obligatorio.' };
  }
  try {
    const user = await prisma.usuario.create({
      data: { nombre: nombre.trim() },
    });
    return { user };
  } catch {
    return { error: 'Error al crear usuario.' };
  }
}

