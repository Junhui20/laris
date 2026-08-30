import { describe, expect, it } from "vitest";
import { jsonLdScript } from "./json-ld.js";

describe("jsonLdScript", () => {
  it("escapes a merchant string that would close the script block", () => {
    const evil = { name: "Rumah </script><script>alert(1)</script>" };
    const out = jsonLdScript(evil);

    expect(out).not.toContain("</script>");
    expect(out).toContain("\\u003c");
    // Still valid JSON, and the value survives intact once parsed.
    expect(JSON.parse(out)).toEqual(evil);
  });

  it("escapes line separators that are legal JSON but break JavaScript", () => {
    const out = jsonLdScript({ a: "x y z" });

    expect(out).not.toContain(" ");
    expect(out).not.toContain(" ");
    expect(JSON.parse(out)).toEqual({ a: "x y z" });
  });

  it("leaves ordinary merchant content alone", () => {
    const ctx = { name: "Rumah Ombak", faq: "有停车位吗？" };
    expect(JSON.parse(jsonLdScript(ctx))).toEqual(ctx);
  });
});
