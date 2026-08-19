import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts, sessions, users, verifications } from "@/lib/db/schema";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: users, session: sessions, account: accounts, verification: verifications },
  }),
  emailAndPassword: {
    enabled: true,
    // Regla del proyecto: no hay registro público. Los usuarios se crean
    // solo desde el panel admin o el seed inicial.
    disableSignUp: true,
  },
  databaseHooks: {
    session: {
      create: {
        // Bloquea la creación de sesión si el usuario fue desactivado o
        // soft-deleted. Better Auth no conoce isActive/deletedAt por sí solo.
        before: async (session) => {
          const [user] = await db
            .select({ isActive: users.isActive, deletedAt: users.deletedAt })
            .from(users)
            .where(eq(users.id, session.userId));

          if (!user || !user.isActive || user.deletedAt) {
            return false;
          }
        },
      },
    },
  },
  plugins: [nextCookies()],
});
