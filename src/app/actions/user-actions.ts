'use server';

import { prisma } from '@/lib/prisma';

export async function getActiveUser() {
  try {
    const user = await prisma.usuario.findFirst({
      orderBy: { id: 'asc' },
    });
    return user;
  } catch {
    return null;
  }
}

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
