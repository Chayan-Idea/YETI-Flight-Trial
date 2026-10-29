import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

const allowedUsers = (process.env.AUTHORIZED_GITHUB_USERS ?? "")
  .split(",").map((name) => name.trim().toLowerCase()).filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub({
    clientId: process.env.AUTH_GITHUB_ID,
    clientSecret: process.env.AUTH_GITHUB_SECRET,
    authorization: { params: { scope: "read:user user:email" } }
  })],
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
  callbacks: {
    async signIn({ profile, user }) {
      const login = (profile as { login?: string } | undefined)?.login ?? user.name ?? "";
      return allowedUsers.includes(login.toLowerCase());
    },
    async session({ session, token }) {
      if (session.user && token.githubLogin) {
        (session.user as typeof session.user & { githubLogin?: string }).githubLogin = String(token.githubLogin);
      }
      return session;
    },
    async jwt({ token, profile, user }) {
      const login = (profile as { login?: string } | undefined)?.login ?? user?.name;
      if (login) token.githubLogin = login;
      return token;
    }
  }
});
