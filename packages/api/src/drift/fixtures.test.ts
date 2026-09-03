import { describe, expect, it } from "vitest";
import kofhByEshaal from "./__fixtures__/kofh-by-eshaal-2026-09-01.html?raw";
import starCafe from "./__fixtures__/star-cafe-kl-2026-09-01.html?raw";
import zeteoCafe from "./__fixtures__/zeteo-cafe-2026-09-01.html?raw";
import { extractIdentity } from "./extract.js";

describe("real Malaysian business page fixtures", () => {
  it("extracts Zeteo Cafe's Restaurant JSON-LD", () => {
    const identity = extractIdentity(zeteoCafe);

    expect(identity).toMatchObject({
      name: { value: "Zeteo Cafe", source: "json-ld", confidence: "certain" },
      phone: { value: "+60-12-270-2890", source: "json-ld", confidence: "certain" },
      address: {
        value: {
          streetAddress: "115, Jalan Petaling",
          area: "Kuala Lumpur",
          postcode: "50000",
          state: "Wilayah Persekutuan",
        },
        source: "json-ld",
        confidence: "certain",
      },
    });
    expect(identity.hours?.value).toHaveLength(6);
  });

  it("keeps KOFH's overnight CafeOrCoffeeShop hours", () => {
    const identity = extractIdentity(kofhByEshaal);

    expect(identity).toMatchObject({
      name: { value: "KOFH by Eshaal", source: "json-ld", confidence: "certain" },
      address: {
        value: {
          streetAddress: "18 Jalan Gurney 1",
          area: "Kuala Lumpur",
          postcode: "54000",
        },
        source: "json-ld",
        confidence: "certain",
      },
    });
    expect(identity.hours?.value).toHaveLength(7);
    expect(identity.hours?.value).toContainEqual({
      weekday: 0,
      opens: "19:00",
      closes: "05:00",
      closesNextDay: true,
    });
  });

  it("does not guess what Star Cafe's equal opening and closing times mean", () => {
    const identity = extractIdentity(starCafe);

    expect(identity).toMatchObject({
      name: { value: "Star Cafe", source: "json-ld", confidence: "certain" },
      phone: { value: "+60 18-903 7777", source: "json-ld", confidence: "certain" },
      address: {
        value: {
          streetAddress: "First Floor, 65, Jalan 109E, Taman Desa, Off Jalan Klang Lama",
          area: "Kuala Lumpur",
          postcode: "58100",
        },
        source: "json-ld",
        confidence: "certain",
      },
    });
    expect(identity.hours).toBeUndefined();
  });
});
