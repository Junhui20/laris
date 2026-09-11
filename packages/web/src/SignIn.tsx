import { useState } from "react";
import { supabase } from "./lib/supabase.js";

/**
 * Signing in with a link sent to the merchant's email.
 *
 * No password. The people this is for run a homestay, not a browser — a
 * password is one more thing to forget, reset and write on a piece of paper by
 * the till. A link they tap on their phone opens the dashboard already signed
 * in, and Supabase handles the session from there.
 */
export function SignIn() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function send(event: React.FormEvent) {
    event.preventDefault();
    setState("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setState("error");
      setMessage(error.message);
      return;
    }
    setState("sent");
  }

  if (state === "sent") {
    return (
      <div className="panel">
        <h1>Check your email</h1>
        <p>
          A sign-in link is on its way to <strong>{email}</strong>. Open it on this device and you
          will be signed in.
        </p>
        <p className="muted">Nothing arrived? It can take a minute, and it may be in spam.</p>
      </div>
    );
  }

  return (
    <form className="panel" onSubmit={send}>
      <h1>Sign in</h1>
      <p>We will email you a link. No password to remember.</p>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />
      <button type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Email me a link"}
      </button>
      {state === "error" ? <p className="error">{message}</p> : null}
    </form>
  );
}
