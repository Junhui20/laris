/**
 * Serialise structured data for embedding in a `<script>` tag.
 *
 * Business Profile content is merchant-supplied — a FAQ answer or a room name
 * containing `</script>` would otherwise close the block early and let the rest
 * of the string be parsed as markup. Escaping `<` as `<` is still valid
 * JSON and still valid JSON-LD, and it closes that off at the only point where
 * merchant text crosses into an executable context.
 *
 * U+2028 and U+2029 are escaped for the same reason: they are legal inside a
 * JSON string but terminate a line in JavaScript source.
 */
export function jsonLdScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
