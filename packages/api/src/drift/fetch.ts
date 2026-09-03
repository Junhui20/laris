const DEFAULT_MAX_BYTES = 1_500_000;
const DEFAULT_MAX_REDIRECTS = 3;
const DEFAULT_TIMEOUT_MS = 8_000;

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal"];

export type FetchedPage = {
  requestedUrl: string;
  finalUrl: string;
  html: string;
};

export type DriftFetchErrorCode =
  | "invalid_url"
  | "unsafe_url"
  | "redirect_limit"
  | "upstream_error"
  | "not_html"
  | "too_large";

export class DriftFetchError extends Error {
  constructor(
    readonly code: DriftFetchErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DriftFetchError";
  }
}

export type FetchPageOptions = {
  fetcher?: typeof fetch;
  maxBytes?: number;
  maxRedirects?: number;
  timeoutMs?: number;
};

/**
 * Accept only ordinary public web URLs. Cloudflare Workers route global fetch
 * over the public Internet and reject direct IP subrequests; these checks keep
 * the same boundary explicit in tests and any future runtime.
 */
export function parsePublicPageUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new DriftFetchError("invalid_url", "expected an absolute HTTP(S) URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new DriftFetchError("unsafe_url", "only HTTP(S) URLs are allowed");
  }
  if (url.username || url.password) {
    throw new DriftFetchError("unsafe_url", "URLs containing credentials are not allowed");
  }
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new DriftFetchError("unsafe_url", "only standard web ports are allowed");
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    hostname === "localhost" ||
    !hostname.includes(".") ||
    BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix)) ||
    isIpLiteral(hostname)
  ) {
    throw new DriftFetchError("unsafe_url", "the URL must use a public hostname");
  }

  url.hash = "";
  return url;
}

export async function fetchPage(
  requestedUrl: string,
  options: FetchPageOptions = {},
): Promise<FetchedPage> {
  const fetcher = options.fetcher ?? fetch;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const initialUrl = parsePublicPageUrl(requestedUrl);
  let currentUrl = initialUrl;

  for (let redirects = 0; ; redirects += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetcher(currentUrl, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          accept: "text/html,application/xhtml+xml;q=0.9",
          "user-agent": "Laris-Drift-Check/1.0",
        },
      });

      if (REDIRECT_STATUSES.has(response.status)) {
        if (redirects >= maxRedirects) {
          await response.body?.cancel();
          throw new DriftFetchError("redirect_limit", "too many redirects");
        }

        const location = response.headers.get("location");
        await response.body?.cancel();
        if (!location) {
          throw new DriftFetchError("upstream_error", "redirect response had no Location header");
        }

        currentUrl = parsePublicPageUrl(new URL(location, currentUrl).href);
        continue;
      }

      if (!response.ok) {
        await response.body?.cancel();
        throw new DriftFetchError("upstream_error", `page returned HTTP ${response.status}`);
      }

      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (
        !contentType.startsWith("text/html") &&
        !contentType.startsWith("application/xhtml+xml")
      ) {
        await response.body?.cancel();
        throw new DriftFetchError("not_html", "page did not return HTML");
      }

      const declaredLength = Number(response.headers.get("content-length"));
      if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
        await response.body?.cancel();
        throw new DriftFetchError("too_large", `page exceeded ${maxBytes} bytes`);
      }

      const html = await readBodyWithLimit(response, maxBytes);
      return {
        requestedUrl: initialUrl.href,
        finalUrl: currentUrl.href,
        html,
      };
    } catch (error) {
      if (error instanceof DriftFetchError) throw error;
      const message = error instanceof Error ? error.message : "unknown fetch failure";
      throw new DriftFetchError("upstream_error", `page fetch failed: ${message}`);
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function readBodyWithLimit(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let html = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        throw new DriftFetchError("too_large", `page exceeded ${maxBytes} bytes`);
      }
      html += decoder.decode(value, { stream: true });
    }
    html += decoder.decode();
    return html;
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

function isIpLiteral(hostname: string): boolean {
  if (hostname.startsWith("[") && hostname.endsWith("]")) return true;
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
}
