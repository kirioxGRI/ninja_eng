'use server';

import { prisma } from '@/lib/prisma';
import { cache } from 'react';
import { getAuthenticatedUser } from '@/lib/authenticated-user';
import { normalizeEmail } from '@/lib/email';

export const getUserForCurrentSession = cache(async () => getAuthenticatedUser());

export async function createUser(nombre: string, email: string) {
  if (!nombre || nombre.trim().length === 0) {
    return { error: 'El nombre es obligatorio.' };
  }

  if (!email || email.trim().length === 0) {
    return { error: 'El correo es obligatorio.' };
  }

  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return { error: 'Ingresa un correo válido.' };
  }

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

  if (!isValidEmail) {
    return { error: 'Ingresa un correo válido.' };
  }

  try {
    const existingUser = await prisma.usuario.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      return { error: 'Ya existe un usuario con ese correo.' };
    }

    const user = await prisma.usuario.create({
      data: {
        nombre: nombre.trim(),
        email: normalizedEmail,
      },
    });

    return { user };
  } catch {
    return { error: 'Error al crear usuario.' };
  }
}
