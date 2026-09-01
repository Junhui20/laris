import type { BusinessContext, Photo } from "@laris/schema";
import type { stay } from "@laris/schema";
import { jsonLdScript } from "./json-ld.js";
import { amenityZh, stateZh } from "./labels.js";
import { faqPageJsonLd, lodgingBusinessJsonLd } from "./schema-org.js";
import { stayGalleryFirstCss } from "./styles.js";

/**
 * The `stay` / `gallery-first` Merchant Site.
 *
 * Rendered on every request from the Business Profile rather than built ahead
 * of time. That is the whole point: a statically built page stays wrong until
 * the next build, and "change it once and everywhere follows" is the first
 * thing this product promises.
 *
 * The markup mirrors design/stay-gallery-first.html, and the stylesheet is
 * lifted from it by `pnpm sync:styles` so the two cannot drift.
 */

const money = (cents: number) => `RM ${(cents / 100).toFixed(0)}`;

/** Cheapest room, which is what "from" pricing and the sticky bar quote. */
function fromRate(ctx: BusinessContext): number | null {
  const rates = ctx.offerings.filter((o) => o.kind === "room_type").map((o) => o.baseRateCents);
  return rates.length > 0 ? Math.min(...rates) : null;
}

/** Highest rate override on a room — the peak the calendar produces. */
function peakRate(room: stay.RoomType): stay.RateOverride | null {
  if (room.rateCalendar.length === 0) return null;
  return room.rateCalendar.reduce((a, b) => (b.rateCents > a.rateCents ? b : a));
}

/**
 * What a guest keeps by booking direct. Stated in ringgit beside the OTA
 * price, because commission is the thing an owner and a guest both feel —
 * "book direct" on its own is a slogan, not an argument.
 */
function directSaving(ctx: BusinessContext) {
  const room =
    ctx.offerings.find((o) => o.kind === "room_type" && o.isSignature) ??
    ctx.offerings.find((o) => o.kind === "room_type");
  const listing = ctx.verticalProfile.stay?.otaListings?.[0];
  if (!room || room.kind !== "room_type" || !room.otaRateCents) return null;
  const direct = room.baseRateCents;
  const saving = room.otaRateCents - direct;
  if (saving <= 0) return null;
  return { ota: room.otaRateCents, direct, saving, platform: listing?.platform };
}

function waLink(whatsapp: string, name: string): string {
  const digits = whatsapp.replace(/[^0-9]/g, "");
  const text = encodeURIComponent(`Hi, 想问问 ${name} 的空房`);
  return `https://wa.me/${digits}?text=${text}`;
}

/**
 * A photo slot. The layout was designed against briefs — "客厅 · 自然光，广角" —
 * and those stay as the fallback rather than a grey box, so a Profile with no
 * photographs yet still reads as a finished page and says what is missing.
 */
function Shot({
  photo,
  brief,
  tone,
  priority,
}: { photo?: Photo; brief: string; tone?: string; priority?: boolean }) {
  return (
    <div class={tone ? `shot ${tone}` : "shot"}>
      {photo ? (
        <img
          src={photo.url}
          alt={photo.alt ?? brief}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
        />
      ) : (
        <span class="brief">{brief}</span>
      )}
    </div>
  );
}

/** Tones cycle so a strip of real photographs keeps the designed rhythm. */
const STRIP_TONES = ["warm", "", "warm", "dusk"];

const STRIP_BRIEFS = [
  "客厅 · 自然光，广角",
  "露台 · 有人坐着看海",
  "厨房 · 干净的台面细节",
  "屋外街景 · 傍晚",
];

/**
 * The single point where structured data crosses into markup. Routing both
 * JSON-LD blocks through here means the escaping in jsonLdScript cannot be
 * forgotten at one of two call sites.
 */
function JsonLd({ data }: { data: unknown }) {
  const __html = jsonLdScript(data);
  // biome-ignore lint/security/noDangerouslySetInnerHtml: escaped above by jsonLdScript
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html }} />;
}

export function StaySite({ ctx, siteUrl }: { ctx: BusinessContext; siteUrl: string }) {
  const { identity, theme } = ctx;
  const rooms = ctx.offerings.filter((o) => o.kind === "room_type");
  const from = fromRate(ctx);
  const saving = directSaving(ctx);
  const landmarks = ctx.verticalProfile.stay?.landmarks ?? [];
  const wa = identity.whatsapp ?? identity.phone;
  const faqLd = faqPageJsonLd(ctx);
  // The hero takes the first photograph; everything after it fills the strip.
  const strip = ctx.photos.slice(1);

  return (
    // biome-ignore lint/a11y/useValidLang: zh-Hans-MY is valid BCP-47 — Simplified Chinese as written in Malaysia
    <html lang="zh-Hans-MY">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{identity.name}</title>
        <meta
          name="description"
          content={`${identity.name} · ${identity.area}${from ? ` · ${money(from)} 起 / 晚` : ""}`}
        />
        <link rel="canonical" href={siteUrl} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Karla:wght@400;500;700&family=Noto+Sans+SC:wght@400;500&display=swap"
        />
        {/* Server-rendered HTML: the stylesheet is our own generated constant, and
            both JSON-LD blocks go through jsonLdScript(), which escapes merchant text
            before it can reach an executable context. */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: own CSS constant, no user input */}
        <style dangerouslySetInnerHTML={{ __html: stayGalleryFirstCss }} />
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: accent is regex-validated hex in SiteTheme */}
        <style dangerouslySetInnerHTML={{ __html: `:root{--accent:${theme.accent}}` }} />
        <JsonLd data={lodgingBusinessJsonLd(ctx, siteUrl)} />
        {faqLd && <JsonLd data={faqLd} />}
      </head>
      <body>
        <header class="hero">
          <Shot photo={ctx.photos[0]} brief="主图 · 黄昏时从露台望向海面，横幅" priority />
          <div class="hero-in">
            <div class="eyebrow">
              {identity.area} · {stateZh(identity.state)}
            </div>
            <div>
              <h1>{identity.name}</h1>
              <p class="where">
                {landmarks[0]?.walkMin
                  ? `走路 ${landmarks[0].walkMin} 分钟到${landmarks[0].name} · `
                  : ""}
                {rooms.length} 间房
              </p>
              {from !== null && (
                <div class="from">
                  <span class="n">{money(from)}</span>
                  <span class="u">
                    起 / 晚
                    {rooms[0]?.kind === "room_type" && rooms[0].minNights > 1
                      ? ` · 最少住 ${rooms[0].minNights} 晚`
                      : ""}
                  </span>
                </div>
              )}
            </div>
          </div>
        </header>

        <div class="strip">
          {strip.length > 0
            ? strip.map((photo, i) => (
                <Shot
                  key={photo.url}
                  photo={photo}
                  brief={photo.alt ?? ""}
                  tone={STRIP_TONES[i % STRIP_TONES.length]}
                />
              ))
            : STRIP_BRIEFS.map((brief, i) => (
                <Shot key={brief} brief={brief} tone={STRIP_TONES[i]} />
              ))}
        </div>

        <section class="wrap">
          <p class="lab">房型</p>
          <h2>{rooms.length} 间房，都可以整栋包下</h2>

          <div class="rooms">
            {rooms.map((room) => {
              if (room.kind !== "room_type") return null;
              const peak = peakRate(room);
              return (
                <article class="room" key={room.id}>
                  <Shot
                    photo={room.photos[0]}
                    brief={`${room.name} · 床 + 窗外`}
                    tone={room.isSignature ? undefined : "warm"}
                  />
                  <div class="room-body">
                    <h3>{room.name}</h3>
                    <p class="pax">
                      {room.description ?? ""} · {room.capacityPax} 人
                    </p>
                    <div class="rate">
                      <b>{money(room.baseRateCents)}</b>
                      <span>/ 晚</span>
                    </div>
                    {peak && (
                      <div class="peak">
                        <span>{peak.label}</span>
                        <b>{money(peak.rateCents)}</b>
                      </div>
                    )}
                    {room.amenities.length > 0 && (
                      <ul class="amen">
                        {room.amenities.map((a) => (
                          <li key={a}>{amenityZh(a)}</li>
                        ))}
                      </ul>
                    )}
                    <p class="mins">
                      入住 {room.checkin} · 退房 {room.checkout} · 最少 {room.minNights} 晚
                    </p>
                  </div>
                </article>
              );
            })}
          </div>

          {saving && (
            <div class="saving">
              <h3>直接跟我们订，便宜一点</h3>
              <p>不经过订房网站，省下的佣金直接算在你身上。同一间房，同一个日期。</p>
              <div class="compare">
                <div>
                  <div class="k">订房网站</div>
                  <div class="v">
                    <s>{money(saving.ota)}</s>
                  </div>
                </div>
                <div>
                  <div class="k">直接 WhatsApp</div>
                  <div class="v">{money(saving.direct)}</div>
                </div>
                <div>
                  <div class="k">你省下</div>
                  <div class="v">{money(saving.saving)} / 晚</div>
                </div>
              </div>
            </div>
          )}
        </section>

        {landmarks.length > 0 && (
          <section class="wrap">
            <p class="lab">位置</p>
            <h2>附近有什么</h2>
            <ul class="near">
              {landmarks.map((l) => (
                <li key={l.name}>
                  <span class="p">{l.name}</span>
                  <span class="t">
                    {l.walkMin ? `走路 ${l.walkMin} 分钟` : `开车 ${l.driveMin} 分钟`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {ctx.faq.length > 0 && (
          <section class="wrap">
            <p class="lab">常见问题</p>
            <h2>客人最常问的</h2>
            <div class="faq">
              {ctx.faq.map((f, i) => (
                <details key={f.q} open={i === 0}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        <footer class="wrap">
          <div class="name">{identity.name}</div>
          <div>
            {identity.addressLines.join(", ")}, {identity.postcode} {identity.area}
          </div>
          <div>
            <a href={`tel:${identity.phone}`}>{identity.phone}</a>
          </div>
          <div class="by">这个页面由 Laris 生成，资料改一次，Google 地图和这里同时更新。</div>
        </footer>

        <nav class="bar">
          {from !== null && (
            <div class="price">
              <b>{money(from)}</b>
              <span>起 / 晚</span>
            </div>
          )}
          <a class="wa" href={waLink(wa, identity.name)} target="_blank" rel="noreferrer noopener">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.2-.7.1s-.7 1-.9 1.2c-.2.2-.3.2-.6.1-1.7-.8-2.8-1.5-3.9-3.4-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5s-.7-1.6-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5 1.9.8 2.6.9 3.5.7.6-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.2-.3-.3-.6-.4z" />
              <path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.4 1.3 4.9L2 22l5.3-1.4c1.4.8 3 1.2 4.7 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3c-.9-1.4-1.3-3-1.3-4.6 0-4.6 3.8-8.4 8.4-8.4s8.4 3.8 8.4 8.4-3.7 8.5-8.3 8.5z" />
            </svg>
            WhatsApp 问空房
          </a>
        </nav>
      </body>
    </html>
  );
}
