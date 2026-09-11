import type { PropsWithChildren } from "hono/jsx";

/**
 * The pages Laris itself serves, as opposed to a Merchant's site.
 *
 * These exist for a specific, unglamorous reason: platform review. TikTok's
 * Content Posting API restricts every post by an unaudited client to private
 * viewing, and lifting that requires an audit; Meta's App Review asks the same
 * kind of questions. Both want to see what the application is, who operates it,
 * what it does with people's data, and on what terms. None of that can be
 * answered by a repository.
 *
 * So this is not marketing. There is no pricing, no sign-up and no demo,
 * because nobody is paying yet and `docs/strategy.md` is blunt about what
 * building for that stage is worth: "someone pays. Every feature added before
 * that is entertainment."
 */

const CSS = `
:root{
  --ground:#F4F6F6; --surface:#fff; --ink:#12222A; --ink-2:#4A626D; --ink-3:#7D939C;
  --rule:#DCE4E6; --accent:#1F6F8F;
}
@media (prefers-color-scheme:dark){
  :root{
    --ground:#0D171C; --surface:#14232A; --ink:#E5EEF1; --ink-2:#A2B7BF;
    --ink-3:#758B94; --rule:#25393F; --accent:#63A9C7;
  }
}
*{box-sizing:border-box}
body{
  margin:0;background:var(--ground);color:var(--ink);
  font:16px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Noto Sans SC",sans-serif;
  -webkit-font-smoothing:antialiased;
}
.wrap{max-width:44rem;margin:0 auto;padding:3rem 1.25rem 5rem}
a{color:var(--accent)}
a:focus-visible,:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:3px}
header.top{display:flex;align-items:baseline;gap:1rem;flex-wrap:wrap;
  padding-bottom:1.25rem;border-bottom:1px solid var(--rule);margin-bottom:2.5rem}
header.top a.brand{font-weight:700;font-size:1.05rem;color:var(--ink);text-decoration:none;letter-spacing:-.01em}
header.top nav{margin-left:auto;display:flex;gap:1.1rem;font-size:.9rem}
h1{font-size:clamp(1.75rem,4.5vw,2.4rem);line-height:1.15;letter-spacing:-.02em;margin:0 0 .75rem}
h2{font-size:1.2rem;margin:2.5rem 0 .5rem;letter-spacing:-.01em}
h3{font-size:1rem;margin:1.5rem 0 .35rem}
p,li{color:var(--ink-2);max-width:38rem}
p:first-of-type{color:var(--ink)}
ul{padding-left:1.15rem}
li{margin:.35rem 0}
.lede{font-size:1.1rem;color:var(--ink-2)}
.meta{font-size:.85rem;color:var(--ink-3)}
.card{background:var(--surface);border:1px solid var(--rule);border-radius:.6rem;padding:1.1rem 1.25rem;margin:1.5rem 0}
.card p{margin:0;color:var(--ink-2)}
table{border-collapse:collapse;width:100%;font-size:.95rem;margin:1rem 0}
th,td{text-align:left;padding:.6rem .75rem;border-bottom:1px solid var(--rule);vertical-align:top;color:var(--ink-2)}
th{color:var(--ink-3);font-weight:600;font-size:.8rem;text-transform:uppercase;letter-spacing:.06em}
footer{margin-top:4rem;padding-top:1.25rem;border-top:1px solid var(--rule);font-size:.85rem;color:var(--ink-3)}
footer a{color:var(--ink-3)}
`;

export function Page({
  title,
  description,
  children,
}: PropsWithChildren<{ title: string; description: string }>) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="color-scheme" content="light dark" />
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: our own stylesheet, no interpolation */}
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
      </head>
      <body>
        <div class="wrap">
          <header class="top">
            <a class="brand" href="/">
              Laris
            </a>
            <nav>
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
            </nav>
          </header>
          {children}
          <footer>
            Laris — customer acquisition for Malaysian local businesses.
            <br />
            Contact: <a href="mailto:imstorage.my@gmail.com">imstorage.my@gmail.com</a> ·{" "}
            <a href="https://github.com/Junhui20/laris">source</a>
          </footer>
        </div>
      </body>
    </html>
  );
}
