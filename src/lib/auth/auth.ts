import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import {
  getUserByEmail,
  createUser,
} from "./user-service";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    authorized: authConfig.callbacks!.authorized,
    signIn: async ({ account, profile }) => {
      if (account?.provider !== "google" || !profile?.email) {
        return false;
      }

      const p = profile as Record<string, unknown>;
      const email = String(p.email);

      const existingUser = await getUserByEmail(email);

      if (existingUser) {
        existingUser.lastActiveAt = new Date();
        existingUser.image = String(p.image ?? existingUser.image);
        existingUser.name = String(p.name ?? existingUser.name);
        await existingUser.save();
      } else {
        await createUser({
          name: String(p.name ?? "Unknown"),
          email,
          image: String(p.image ?? ""),
          provider: String(account.provider),
          googleId: String(account.providerAccountId),
        });
      }

      return true;
    },
    jwt: async ({ token, account, trigger }) => {
      if (account?.provider === "google" || trigger === "update") {
        const userEmail = token.email;
        if (!userEmail) return token;

        const dbUser = await getUserByEmail(userEmail);
        if (dbUser) {
          token.id = dbUser._id.toString();
          token.username = dbUser.username;
          token.picture = dbUser.image;
          token.name = dbUser.name;
        }
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
      }
      return session;
    },
  },
});
