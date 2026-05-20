import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";
import { NextResponse } from "next/server";

const { auth: middleware } = NextAuth(authConfig);

export default middleware((req) => {
  const res = NextResponse.next();

  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );

  return res;
});

export const config = {
  matcher: [
    "/chat/:path*",
    "/settings/:path*",
    "/api/messages/:path*",
    "/api/friends/:path*",
    "/api/conversations/:path*",
    "/api/users/:path*",
    "/api/pusher/:path*",
  ],
};
