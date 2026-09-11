import { describe, expect, it } from "vitest";
import { extractIdentity } from "./extract.js";

describe("extractIdentity", () => {
  it("extracts a complete JSON-LD Business Profile projection", () => {
    const extracted = extractIdentity(`
      <!doctype html>
      <html><head>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "LodgingBusiness",
            "name": "Rumah Ombak",
            "telephone": "+60 12-345 6789",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "12 Jalan Batu Ferringhi",
              "addressLocality": "Batu Ferringhi",
              "postalCode": "11100",
              "addressRegion": "Pulau Pinang"
            },
            "openingHours": ["Mo-Fr 09:00-18:00"]
          }
        </script>
      </head><body><h1>A conflicting visible title</h1></body></html>
    `);

    expect(extracted.name).toMatchObject({ value: "Rumah Ombak", source: "json-ld" });
    expect(extracted.phone?.value).toBe("+60 12-345 6789");
    expect(extracted.address?.value.postcode).toBe("11100");
    expect(extracted.hours?.value).toHaveLength(5);
  });

  it("falls back per field instead of choosing one source for the whole page", () => {
    const extracted = extractIdentity(`
      <script type="application/ld+json">
        { "@type": "LocalBusiness", "name": "JSON-LD Name" }
      </script>
      <main itemscope itemtype="https://schema.org/LocalBusiness">
        <span itemprop="name">Microdata Name</span>
        <a itemprop="telephone" href="tel:+6048812345">Call</a>
        <div itemprop="address" itemscope itemtype="https://schema.org/PostalAddress">
          <span itemprop="streetAddress">12 Jln Pantai</span>
          <span itemprop="addressLocality">Batu Ferringhi</span>
          <span itemprop="postalCode">11100</span>
        </div>
      </main>
    `);

    expect(extracted.name).toMatchObject({ value: "JSON-LD Name", source: "json-ld" });
    expect(extracted.phone).toMatchObject({ value: "tel:+6048812345", source: "microdata" });
    expect(extracted.address).toMatchObject({
      source: "microdata",
      value: {
        streetAddress: "12 Jln Pantai",
        area: "Batu Ferringhi",
        postcode: "11100",
      },
    });
  });

  it("uses business meta before visible text", () => {
    const extracted = extractIdentity(`
      <meta property="og:site_name" content="Meta Shop">
      <meta property="business:contact_data:phone_number" content="03-1234 5678">
      <h1>Visible Shop</h1>
      <a href="tel:0399999999">Call</a>
    `);

    expect(extracted.name).toMatchObject({
      value: "Meta Shop",
      source: "meta",
      confidence: "likely",
    });
    expect(extracted.phone).toMatchObject({
      value: "03-1234 5678",
      source: "meta",
      confidence: "certain",
    });
  });

  it("keeps malformed JSON-LD from hiding later valid structured data", () => {
    const extracted = extractIdentity(`
      <script type="application/ld+json">{ broken JSON</script>
      <script type="application/ld+json"><!--
        { "@type": "Organization", "name": "Valid Shop" };
      --></script>
    `);

    expect(extracted.name?.value).toBe("Valid Shop");
  });

  it("marks visible-only fallbacks likely except an explicit tel link", () => {
    const extracted = extractIdentity(`
      <h1>Visible Shop</h1>
      <address>8 Jalan SS15/4, Subang Jaya</address>
      <a href="tel:+60123456789">WhatsApp or call</a>
    `);

    expect(extracted.name?.confidence).toBe("likely");
    expect(extracted.address?.confidence).toBe("likely");
    expect(extracted.phone).toMatchObject({ value: "+60123456789", confidence: "certain" });
    expect(extracted.hours).toBeUndefined();
  });
});
