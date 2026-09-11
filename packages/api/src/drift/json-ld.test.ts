import { describe, expect, it } from "vitest";
import { extractJsonLdIdentity } from "./json-ld.js";

describe("extractJsonLdIdentity", () => {
  it("prefers a specific business in @graph over the site Organization", () => {
    const extracted = extractJsonLdIdentity([
      {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            name: "Website Company",
            telephone: "+60 3-1111 2222",
          },
          {
            "@type": "https://schema.org/LodgingBusiness",
            name: "Rumah Ombak",
            telephone: "+60 12-345 6789",
            address: {
              "@type": "PostalAddress",
              streetAddress: "12 Jalan Batu Ferringhi",
              addressLocality: "Batu Ferringhi",
              postalCode: "11100",
              addressRegion: "Pulau Pinang",
            },
          },
        ],
      },
    ]);

    expect(extracted.name).toMatchObject({
      value: "Rumah Ombak",
      source: "json-ld",
      confidence: "certain",
    });
    expect(extracted.phone?.value).toBe("+60 12-345 6789");
    expect(extracted.address).toMatchObject({
      value: {
        streetAddress: "12 Jalan Batu Ferringhi",
        area: "Batu Ferringhi",
        postcode: "11100",
        state: "Pulau Pinang",
      },
      raw: "12 Jalan Batu Ferringhi, Batu Ferringhi, 11100, Pulau Pinang",
    });
  });

  it("extracts weekly and overnight opening-hours specifications", () => {
    const extracted = extractJsonLdIdentity([
      {
        "@type": ["Thing", "LocalBusiness"],
        name: "Kedai Malam",
        openingHoursSpecification: [
          {
            dayOfWeek: ["https://schema.org/Monday", "Tuesday"],
            opens: "09:00:00",
            closes: "18:00:00",
          },
          {
            dayOfWeek: "Friday",
            opens: "18:00",
            closes: "02:00",
          },
        ],
      },
    ]);

    expect(extracted.hours?.value).toEqual([
      { weekday: 1, opens: "09:00", closes: "18:00", closesNextDay: false },
      { weekday: 2, opens: "09:00", closes: "18:00", closesNextDay: false },
      { weekday: 5, opens: "18:00", closes: "02:00", closesNextDay: true },
    ]);
    expect(extracted.hours?.raw).toBe("1:09:00-18:00;2:09:00-18:00;5:18:00-02:00+1");
  });

  it("accepts a plain string address without inventing missing parts", () => {
    const extracted = extractJsonLdIdentity([
      {
        "@type": "Organization",
        name: "Simple Shop",
        address: "8, Jalan SS15/4, Subang Jaya",
      },
    ]);

    expect(extracted.address?.value).toEqual({
      streetAddress: "8, Jalan SS15/4, Subang Jaya",
    });
  });

  it("falls back to schema.org's compact openingHours syntax", () => {
    const extracted = extractJsonLdIdentity([
      {
        "@type": "LocalBusiness",
        name: "Simple Shop",
        openingHours: ["Mo-Fr 09:00-18:00", "Sa 09:00-13:00"],
      },
    ]);

    expect(extracted.hours?.value).toHaveLength(6);
    expect(extracted.hours?.raw).toContain("6:09:00-13:00");
  });

  it("ignores unsupported or malformed entities", () => {
    expect(
      extractJsonLdIdentity([
        null,
        "not an object",
        { "@type": "Person", name: "Owner, not the business" },
        { "@type": "LocalBusiness", name: "", telephone: 12345 },
      ]),
    ).toEqual({});
  });
});
