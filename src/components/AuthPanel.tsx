"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { isDemoBackend, store, type SessionUser } from "@/lib/data";

export function AuthPanel({ onAuthenticated }: { onAuthenticated: (user: SessionUser) => void }) {
  const { notify } = useToast();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 6) {
      notify("Use a password of at least 6 characters.", "error");
      return;
    }
    setBusy(true);
    try {
      const user =
        mode === "signin"
          ? await store.signIn(email.trim(), password)
          : await store.signUp(email.trim(), password);
      if (user) onAuthenticated(user);
      else notify("Check your inbox to confirm the account, then sign in.", "info");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Authentication failed.", "error");
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    "w-full rounded-sm border border-line-strong bg-surface px-3 py-2.5 text-[15px] text-ink placeholder:text-muted/70 transition-colors duration-150 focus:border-accent";

  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="w-full max-w-[352px]">
        <h1 className="text-[19px] font-semibold tracking-[-0.02em] text-ink">Habit Journal</h1>
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">
          A habit tracker that remembers what actually happened.
        </p>

        <form onSubmit={submit} className="mt-7 space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-[13.5px] font-medium text-ink-soft">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className={inputClass}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-[13.5px] font-medium text-ink-soft">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className={inputClass}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <Button variant="primary" type="submit" className="w-full" disabled={busy}>
            {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <p className="mt-4 text-[14px] text-muted">
          {mode === "signin" ? "No account yet?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="font-medium text-accent underline-offset-2 hover:underline"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Create one" : "Sign in"}
          </button>
        </p>

        {isDemoBackend && (
          <p className="mt-8 rounded-sm border border-line bg-surface px-3.5 py-3 text-[13.5px] leading-relaxed text-muted">
            Supabase isn’t configured, so accounts and entries live in this browser only. Add{" "}
            <code className="text-ink-soft">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="text-ink-soft">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to switch to real
            persistence.
          </p>
        )}
      </div>
    </div>
  );
}
