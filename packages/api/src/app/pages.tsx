import { Page } from "./layout.js";

/** Kept in one place so the two documents cannot drift apart on their dates. */
export const LAST_UPDATED = "2 September 2026";
const CONTACT = "imstorage.my@gmail.com";

export function Home() {
  return (
    <Page
      title="Laris — one source of truth for a local business's online presence"
      description="Laris keeps a Malaysian local business's facts in one place and publishes them to Google Business Profile, its website and social channels."
    >
      <h1>One place for the facts, five places they show up</h1>
      <p class="lede">
        A homestay owner changes her price on Google and forgets Facebook. A café changes its hours
        and the website still says otherwise. Laris keeps those facts in one Business Profile and
        publishes them out — to Google Business Profile, the business's own site, and its social
        channels — so a change is made once.
      </p>

      <h2>What it is for</h2>
      <p>
        Malaysian local businesses: homestays, cafés, shops, services. The people who run them are
        not marketers and do not want a dashboard with forty settings. Laris is built for the owner
        who says "I don't understand this, please just handle it".
      </p>

      <h2>What it does with a business's accounts</h2>
      <p>
        With the owner's permission, Laris connects to the platforms their business is already on
        and writes what they approve. It never posts anything an owner has not seen and accepted.
      </p>
      <ul>
        <li>
          <strong>Google Business Profile</strong> — reads the listing, writes the business's name,
          address, phone, hours and posts.
        </li>
        <li>
          <strong>Facebook and Instagram</strong> — publishes posts and images the owner approves.
        </li>
        <li>
          <strong>TikTok</strong> — publishes video the owner approves.
        </li>
        <li>
          <strong>The business's own website</strong> — rendered from the same Business Profile, so
          it cannot fall behind.
        </li>
      </ul>

      <h2>Where it is</h2>
      <div class="card">
        <p>
          <strong>In development, with one live business.</strong> Laris is not open for sign-ups.
          The first Merchant is a homestay on Pulau Pangkor whose site is served by this same
          system. Two people build it; the source is public.
        </p>
      </div>
      <p class="meta">
        Operated by the maintainers of{" "}
        <a href="https://github.com/Junhui20/laris">github.com/Junhui20/laris</a>. Questions,
        including anything about data: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    </Page>
  );
}

export function Privacy() {
  return (
    <Page
      title="Privacy — Laris"
      description="What Laris collects, why, how long it keeps it, and how to have it deleted."
    >
      <h1>Privacy</h1>
      <p class="lede">
        Laris holds business information and the access it is given to a business's own accounts. It
        is not an advertising product and it does not sell anything to anyone.
      </p>
      <p class="meta">Last updated {LAST_UPDATED}.</p>

      <div class="card">
        <p>
          <strong>Not reviewed by a lawyer.</strong> This describes what the software actually does,
          written by the people who wrote the software. It is accurate; it has not been checked for
          legal sufficiency in any jurisdiction, and it should be before Laris takes on a customer
          who is not family.
        </p>
      </div>

      <h2>Who we are</h2>
      <p>
        Laris is operated by the two maintainers of{" "}
        <a href="https://github.com/Junhui20/laris">github.com/Junhui20/laris</a>. For anything in
        this document, including a deletion request, write to{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>

      <h2>What we hold</h2>
      <table>
        <thead>
          <tr>
            <th>What</th>
            <th>Why</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>Business Profile</strong> — name, address, phone, WhatsApp, opening hours,
              what the business offers, photographs, frequently asked questions
            </td>
            <td>It is the thing being published. Every channel shows a projection of it.</td>
          </tr>
          <tr>
            <td>
              <strong>Access tokens</strong> for the accounts an owner connects — Google Business
              Profile, Facebook, Instagram, TikTok
            </td>
            <td>
              To read those listings and to publish what the owner approves. Held encrypted, used
              for nothing else, and revocable by the owner at any time from the platform itself.
            </td>
          </tr>
          <tr>
            <td>
              <strong>Account details</strong> — the email address used to sign in
            </td>
            <td>To let a person sign in and to reach them about their own account.</td>
          </tr>
          <tr>
            <td>
              <strong>Published content and its results</strong> — what went out, and the counts the
              platforms report back
            </td>
            <td>
              To tell an owner whether it worked, and to make later suggestions better than guesses.
            </td>
          </tr>
        </tbody>
      </table>

      <h3>What we do not hold</h3>
      <ul>
        <li>Payment details. Laris does not take payments.</li>
        <li>
          Customers' personal information. Laris publishes a business's own facts; it does not build
          audiences or lists of the people who read them.
        </li>
        <li>Passwords for connected platforms. Connections use OAuth; we never see them.</li>
      </ul>

      <h2>What we do with it</h2>
      <p>
        We publish it where the owner asks us to, and we show it back to them. We do not sell it,
        rent it, or hand it to advertisers. It is shared only with the platforms an owner has
        connected — because publishing to a platform means sending it there — and with the
        infrastructure that runs the service.
      </p>

      <h3>Processors</h3>
      <ul>
        <li>
          <strong>Cloudflare</strong> — serves the sites and the API.
        </li>
        <li>
          <strong>Supabase</strong> — the database holding Business Profiles.
        </li>
        <li>
          <strong>Platforms the owner connects</strong> — Google, Meta, TikTok — which receive what
          is published to them, on their own terms.
        </li>
      </ul>

      <h2>How long</h2>
      <p>
        A Business Profile is kept while the business uses Laris. Tokens are deleted when a
        connection is removed. Ask us to delete an account and everything belonging to it goes
        within 30 days, apart from anything a platform has already published, which has to be
        removed on that platform.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Ask for a copy of what we hold about your business.</li>
        <li>Ask us to correct it, or correct it yourself.</li>
        <li>Ask us to delete it.</li>
        <li>
          Disconnect any platform, at any time, from Laris or from the platform's own settings.
          Revoking there takes effect immediately whatever we do.
        </li>
      </ul>
      <p>
        One address for all of it: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>

      <h2>Where it is kept</h2>
      <p>
        Data is stored in Southeast Asia (Singapore), close to the businesses it belongs to.
        Connected platforms hold their own copies in their own regions under their own policies.
      </p>

      <h2>Children</h2>
      <p>Laris is a tool for businesses and is not directed at anyone under 18.</p>

      <h2>Changes</h2>
      <p>
        If this document changes materially we will say so to every business using Laris before it
        takes effect. The date at the top is the last change.
      </p>
    </Page>
  );
}

export function Terms() {
  return (
    <Page title="Terms of Service — Laris" description="The terms on which Laris is provided.">
      <h1>Terms of Service</h1>
      <p class="lede">
        These are the terms on which Laris is provided. They are short because the service is small
        and honest about being early.
      </p>
      <p class="meta">Last updated {LAST_UPDATED}.</p>

      <div class="card">
        <p>
          <strong>Not reviewed by a lawyer</strong>, and Laris is not open for sign-ups. Anyone
          using it today has been invited directly.
        </p>
      </div>

      <h2>What we provide</h2>
      <p>
        Laris keeps a business's facts in one place and publishes them to the channels the business
        connects. It is provided as it is, without a guaranteed level of service, and it may change
        or stop.
      </p>

      <h2>What you are responsible for</h2>
      <ul>
        <li>
          <strong>That the facts are true.</strong> Laris publishes what the Business Profile says.
          It cannot know that a price or an opening time is wrong.
        </li>
        <li>
          <strong>That you may connect the accounts you connect</strong>, and that you own or have
          permission to publish the photographs and text you give us.
        </li>
        <li>
          <strong>Following the rules of the platforms you publish to.</strong> Google, Meta and
          TikTok each have their own terms, and yours with them are not ours to keep.
        </li>
      </ul>

      <h2>What we will not do</h2>
      <ul>
        <li>Publish anything you have not approved.</li>
        <li>Sell, rent or share your data for advertising.</li>
        <li>
          Post to a connected account for any purpose other than yours, or keep using a connection
          after you remove it.
        </li>
      </ul>

      <h2>Stopping</h2>
      <p>
        Stop whenever you like. Ask and we delete what we hold, as the{" "}
        <a href="/privacy">privacy page</a> describes. We may stop providing Laris to an account
        that breaks these terms or a connected platform's rules, and we will say why.
      </p>

      <h2>Liability</h2>
      <p>
        Laris is provided without warranty. To the extent the law allows, we are not liable for lost
        business, lost data, or anything a connected platform does with content published through
        it. Nothing here limits liability that cannot be limited by law.
      </p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
      </p>
    </Page>
  );
}
