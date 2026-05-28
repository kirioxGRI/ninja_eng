import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { normalizeEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  callbacks: {
    async signIn({ user }) {
      const normalizedEmail = normalizeEmail(user.email);

      if (!normalizedEmail) {
        return false;
      }

      const existingUser = await prisma.usuario.findUnique({
        where: {
          email: normalizedEmail,
        },
      });

      return !!existingUser;
    },
  },
});
