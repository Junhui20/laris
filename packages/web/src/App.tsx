import type { BusinessContext } from "@laris/schema";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { ProfileEditor } from "./ProfileEditor.js";
import { SignIn } from "./SignIn.js";
import { type MerchantRow, listMerchants } from "./lib/profile.js";
import { configured, supabase } from "./lib/supabase.js";

/**
 * The merchant dashboard.
 *
 * Application-shaped and behind a login, which is why it is a SPA rather than
 * an edge-rendered page — see docs/STACK.md. Its whole job is editing the
 * Business Profile, because the Profile is the single source of truth and every
 * Channel is a projection of it.
 *
 * It talks to Supabase directly as the signed-in user rather than through the
 * Worker, so the row-level security policies *are* the authorisation. The
 * Worker holds the service role, which bypasses them; routing edits through it
 * would mean writing the Account-scoping rules a second time and getting them
 * right twice.
 */
export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [merchants, setMerchants] = useState<MerchantRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) {
      setReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setMerchants(null);
      return;
    }
    listMerchants()
      .then(setMerchants)
      .catch((cause: Error) => setError(cause.message));
  }, [session]);

  if (!configured) {
    return (
      <main>
        <div className="panel">
          <h1>Not configured</h1>
          <p>
            Copy <code>packages/web/.env.example</code> to <code>.env.local</code> and fill in the
            Supabase project URL and anon key. Both are public values.
          </p>
        </div>
      </main>
    );
  }

  if (!ready) return <main />;
  if (!session) {
    return (
      <main>
        <SignIn />
      </main>
    );
  }

  const current = merchants?.find((m) => m.slug === open);

  return (
    <main>
      <header className="bar">
        <span className="brand">Laris</span>
        <span className="who">{session.user.email}</span>
        <button type="button" className="link" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </header>

      {error ? <p className="error">{error}</p> : null}

      {current ? (
        <ProfileEditor
          slug={current.slug}
          profile={current.business_context}
          onBack={() => setOpen(null)}
          onSaved={(saved: BusinessContext) =>
            setMerchants(
              (list) =>
                list?.map((m) =>
                  m.slug === current.slug ? { ...m, business_context: saved } : m,
                ) ?? null,
            )
          }
        />
      ) : (
        <div className="panel">
          <h1>Your businesses</h1>
          {merchants === null ? <p className="muted">Loading…</p> : null}
          {merchants?.length === 0 ? (
            <p className="muted">
              Nothing here yet. A business is added for you during setup — if you expected one, the
              account you signed in with may not be the one it belongs to.
            </p>
          ) : null}
          <ul className="merchants">
            {merchants?.map((m) => (
              <li key={m.slug}>
                <button type="button" onClick={() => setOpen(m.slug)}>
                  <strong>{m.business_context.identity.name}</strong>
                  <span className="muted">
                    {m.business_context.identity.area ?? m.business_context.identity.postcode}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
