"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { data: session } = useSession();

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight">Secure Chat</h1>
      <p className="text-lg text-muted">A secure real-time messaging app.</p>

      {session ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted">
            Signed in as <span className="text-foreground font-medium">{session.user?.name}</span>
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => signOut()}>
              Sign Out
            </Button>
            <a href="/chat">
              <Button variant="primary">Go to Chat</Button>
            </a>
          </div>
        </div>
      ) : (
        <Button variant="primary" onClick={() => signIn("google")}>
          Sign in with Google
        </Button>
      )}
    </div>
  );
}
