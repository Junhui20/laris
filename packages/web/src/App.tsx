import type { BusinessContext } from "@laris/schema";
import { useEffect, useState } from "react";

/**
 * The merchant dashboard.
 *
 * Deliberately application-shaped and behind a login — none of the static-site
 * strengths that make the Merchant Site what it is apply here. Its whole job is
 * editing the Business Profile, because the Profile is the single source of
 * truth and every Channel is a projection of it.
 *
 * Phase 00 scope: read the Profile, show the Channels it feeds, and link out to
 * the live site. Editing lands next; this is the shell the forms hang in.
 */

const SLUG = "rumah-ombak";

type Load =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; ctx: BusinessContext };

export function App() {
  const [load, setLoad] = useState<Load>({ state: "loading" });

  useEffect(() => {
    fetch(`/v1/merchants/${SLUG}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`${r.status} — is \`pnpm dev:api\` running?`);
        return r.json();
      })
      .then((ctx: BusinessContext) => setLoad({ state: "ready", ctx }))
      .catch((e: Error) => setLoad({ state: "error", message: e.message }));
  }, []);

  if (load.state === "loading") return <Shell>Loading…</Shell>;
  if (load.state === "error") {
    return (
      <Shell>
        <p style={{ color: "#9A2F24" }}>Could not load the profile: {load.message}</p>
        <p style={{ color: "#6D7C77" }}>
          Start the API with <code>pnpm dev:api</code>, then reload. With no Supabase credentials it
          serves the fixture merchant.
        </p>
      </Shell>
    );
  }

  const { ctx } = load;
  const rooms = ctx.offerings.filter((o) => o.kind === "room_type");

  return (
    <Shell>
      <header style={{ marginBottom: 28 }}>
        <div style={label}>{ctx.vertical}</div>
        <h1 style={{ margin: "6px 0 4px", fontSize: 30 }}>{ctx.identity.name}</h1>
        <div style={{ color: "#6D7C77" }}>
          {ctx.identity.area} · {ctx.identity.state}
        </div>
      </header>

      <Card title="Identity">
        <Row k="Phone" v={ctx.identity.phone} />
        <Row k="WhatsApp" v={ctx.identity.whatsapp ?? "—"} />
        <Row k="Address" v={`${ctx.identity.addressLines.join(", ")}, ${ctx.identity.postcode}`} />
        <p style={note}>
          These are the fields Drift Check compares every Channel against, so they are edited here
          and nowhere else.
        </p>
      </Card>

      <Card title={`Offerings · ${rooms.length}`}>
        {rooms.map((r) =>
          r.kind === "room_type" ? (
            <Row
              key={r.id}
              k={r.name}
              v={[
                r.baseRateCents === undefined
                  ? "quote on enquiry"
                  : `RM ${(r.baseRateCents / 100).toFixed(0)}`,
                `${r.capacityPax} pax`,
                `min ${r.minNights}`,
              ].join(" · ")}
            />
          ) : null,
        )}
      </Card>

      <Card title="Channels">
        <Row k="Merchant Site" v={<a href={`/site/${SLUG}`}>open ↗</a>} />
        <Row k="Google Business Profile" v="not connected" />
        <Row k="Social" v="not connected" />
        <p style={note}>
          A Channel supports Publish, Profile Write, both or neither — see CONTEXT.md. Where Profile
          Write is unavailable it gets Drift Check.
        </p>
      </Card>
    </Shell>
  );
}

const label: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: ".14em",
  textTransform: "uppercase",
  color: "#10665A",
  fontWeight: 700,
};

const note: React.CSSProperties = {
  fontSize: 13,
  color: "#6D7C77",
  margin: "14px 0 0",
  lineHeight: 1.6,
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "48px 20px 80px",
        fontFamily: "Karla, -apple-system, 'Noto Sans SC', 'PingFang SC', sans-serif",
        color: "#16211E",
        lineHeight: 1.6,
      }}
    >
      {children}
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #DDE3DF",
        borderRadius: 8,
        padding: "20px 22px",
        marginBottom: 16,
      }}
    >
      <h2 style={{ fontSize: 15, margin: "0 0 14px", letterSpacing: ".01em" }}>{title}</h2>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 20,
        padding: "9px 0",
        borderBottom: "1px solid #F0F3F1",
        fontSize: 14.5,
      }}
    >
      <span style={{ color: "#6D7C77" }}>{k}</span>
      <span style={{ textAlign: "right" }}>{v}</span>
    </div>
  );
}
