import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      id: "staff",
      name: "credentials",
      credentials: {
        email: { label: "아이디", type: "text" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user) return null;
        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
    CredentialsProvider({
      id: "client-portal",
      name: "client-portal",
      credentials: {
        email: { label: "아이디", type: "text" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const cu = await prisma.clientUser.findUnique({ where: { email: credentials.email }, include: { client: { select: { id: true, name: true } } } });
        if (!cu) return null;
        const ok = await bcrypt.compare(credentials.password, cu.password);
        if (!ok) return null;
        return { id: cu.id, email: cu.email, name: cu.name, role: "CLIENT", clientId: cu.clientId, clientName: cu.client.name } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        if ((user as any).clientId) { token.clientId = (user as any).clientId; token.clientName = (user as any).clientName; }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        if (token.clientId) { (session.user as any).clientId = token.clientId; (session.user as any).clientName = token.clientName; }
      }
      return session;
    },
  },
};
