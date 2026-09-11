import type { BusinessContext } from "@laris/schema";
import { useState } from "react";
import { type SaveResult, saveProfile } from "./lib/profile.js";

/**
 * Editing the facts a Merchant actually changes.
 *
 * Not every field in the schema. The Profile holds things that are set once at
 * onboarding — the vertical, the theme, the slug — and things that move: a
 * phone number, a price, what the rooms are, the answers to questions guests
 * keep asking. Only the second kind is here, because a form with forty inputs
 * is how an owner decides not to bother.
 *
 * Opening hours are missing on purpose. An absent weekday in the current schema
 * means both "closed" and "not filled in", so an hours editor would have to
 * pick one and be wrong half the time. That is #14.
 */

const money = (cents: number | undefined) => (cents === undefined ? "" : (cents / 100).toFixed(2));
const cents = (text: string): number | undefined => {
  const value = Number.parseFloat(text);
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : undefined;
};

export function ProfileEditor({
  slug,
  profile,
  onSaved,
  onBack,
}: {
  slug: string;
  profile: BusinessContext;
  onSaved: (saved: BusinessContext) => void;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState<BusinessContext>(profile);
  const [base] = useState(profile.updatedAt);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [problem, setProblem] = useState<SaveResult | null>(null);

  const offering = draft.offerings[0];
  const identity = draft.identity;

  const edit = (patch: Partial<BusinessContext>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setState("idle");
    setProblem(null);
  };
  const editIdentity = (patch: Partial<BusinessContext["identity"]>) =>
    edit({ identity: { ...identity, ...patch } });
  const editOffering = (patch: Record<string, unknown>) => {
    if (!offering) return;
    edit({ offerings: [{ ...offering, ...patch }, ...draft.offerings.slice(1)] as never });
  };

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setState("saving");
    const result = await saveProfile(slug, draft, base);
    if (result.ok) {
      setState("saved");
      onSaved(result.profile);
      return;
    }
    setState("idle");
    setProblem(result);
  }

  return (
    <form className="panel wide" onSubmit={save}>
      <button type="button" className="link" onClick={onBack}>
        ← All businesses
      </button>
      <h1>{identity.name}</h1>
      <p className="muted">
        Everything here shows up on the website, on Google, and in anything published for you.
        Change it once.
      </p>

      <h2>Contact</h2>
      <label htmlFor="name">Business name</label>
      <input
        id="name"
        value={identity.name}
        onChange={(e) => editIdentity({ name: e.target.value })}
      />
      <p className="hint">
        Must match your Google Business Profile exactly, or the two will disagree.
      </p>

      <div className="row">
        <div>
          <label htmlFor="phone">Phone</label>
          <input
            id="phone"
            value={identity.phone}
            onChange={(e) => editIdentity({ phone: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="whatsapp">WhatsApp</label>
          <input
            id="whatsapp"
            value={identity.whatsapp ?? ""}
            onChange={(e) => editIdentity({ whatsapp: e.target.value || undefined })}
          />
        </div>
      </div>

      <label htmlFor="address">Address</label>
      <input
        id="address"
        value={identity.addressLines.join(", ")}
        onChange={(e) =>
          editIdentity({
            addressLines: e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean) as never,
          })
        }
      />
      <div className="row">
        <div>
          <label htmlFor="area">Area</label>
          <input
            id="area"
            value={identity.area ?? ""}
            onChange={(e) => editIdentity({ area: e.target.value || undefined })}
          />
        </div>
        <div>
          <label htmlFor="postcode">Postcode</label>
          <input
            id="postcode"
            value={identity.postcode}
            onChange={(e) => editIdentity({ postcode: e.target.value })}
          />
        </div>
      </div>

      {offering ? (
        <>
          <h2>{offering.name}</h2>
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            rows={5}
            value={offering.description ?? ""}
            onChange={(e) => editOffering({ description: e.target.value || undefined })}
          />

          <div className="row">
            <div>
              <label htmlFor="rate">Price per night (RM)</label>
              <input
                id="rate"
                inputMode="decimal"
                placeholder="leave empty to quote on enquiry"
                value={money((offering as { baseRateCents?: number }).baseRateCents)}
                onChange={(e) => editOffering({ baseRateCents: cents(e.target.value) })}
              />
              <p className="hint">Empty means you tell people when they ask.</p>
            </div>
            <div>
              <label htmlFor="pax">Sleeps</label>
              <input
                id="pax"
                inputMode="numeric"
                value={String((offering as { capacityPax: number }).capacityPax)}
                onChange={(e) =>
                  editOffering({ capacityPax: Number.parseInt(e.target.value, 10) || 1 })
                }
              />
            </div>
          </div>

          <div className="row">
            <div>
              <label htmlFor="checkin">Check-in</label>
              <input
                id="checkin"
                placeholder="14:00"
                value={(offering as { checkin?: string }).checkin ?? ""}
                onChange={(e) => editOffering({ checkin: e.target.value || undefined })}
              />
            </div>
            <div>
              <label htmlFor="checkout">Check-out</label>
              <input
                id="checkout"
                placeholder="12:00"
                value={(offering as { checkout?: string }).checkout ?? ""}
                onChange={(e) => editOffering({ checkout: e.target.value || undefined })}
              />
            </div>
          </div>
          <p className="hint">Leave these empty if it depends. Empty is not 15:00.</p>
        </>
      ) : null}

      <h2>Questions guests ask</h2>
      {draft.faq.map((entry, i) => (
        <div className="faq" key={`${entry.q}-${i}`}>
          <input
            aria-label={`Question ${i + 1}`}
            value={entry.q}
            onChange={(e) =>
              edit({
                faq: draft.faq.map((f, j) => (i === j ? { ...f, q: e.target.value } : f)) as never,
              })
            }
          />
          <textarea
            aria-label={`Answer ${i + 1}`}
            rows={2}
            value={entry.a}
            onChange={(e) =>
              edit({
                faq: draft.faq.map((f, j) => (i === j ? { ...f, a: e.target.value } : f)) as never,
              })
            }
          />
        </div>
      ))}

      <div className="actions">
        <button type="submit" disabled={state === "saving"}>
          {state === "saving" ? "Saving…" : "Save"}
        </button>
        {state === "saved" ? <span className="ok">Saved. Everywhere.</span> : null}
      </div>

      {problem && !problem.ok && problem.reason === "conflict" ? (
        <div className="conflict">
          <strong>Somebody else saved while you were editing.</strong>
          <p>
            Your changes are still on screen and have not been sent. Their version is live. Copy
            anything you need, then reload to start from theirs — saving over it would throw their
            edit away.
          </p>
        </div>
      ) : null}
      {problem && !problem.ok && problem.reason === "denied" ? (
        <p className="error">{problem.message}</p>
      ) : null}
    </form>
  );
}
