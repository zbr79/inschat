// Minimal server-side web tools. No external deps: fetch + conservative
// HTML/XML-to-text parsing.

const MAX_BYTES = 512 * 1024;
const MAX_TEXT = 8000;
const MAX_SEARCH_RESULTS = 6;

function decodeHtml(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(parseInt(code, 16))
    );
}

function stripHtml(html: string): string {
  return decodeHtml(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchResponse {
  ok: boolean;
  results?: WebSearchResult[];
  error?: string;
}

function xmlField(item: string, field: string): string {
  const match = item.match(new RegExp(`<${field}>([\\s\\S]*?)</${field}>`, "i"));
  return match ? stripHtml(match[1]) : "";
}

export async function searchWeb(query: string): Promise<WebSearchResponse> {
  const trimmed = query.trim().slice(0, 200);
  if (!trimmed) return { ok: false, error: "Search query is empty." };

  const searchUrl = `https://www.bing.com/search?format=rss&q=${encodeURIComponent(
    trimmed
  )}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "InsChat/1.0",
        Accept: "application/rss+xml,text/xml;q=0.9",
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      return { ok: false, error: `Search provider returned HTTP ${response.status}.` };
    }
    const xml = (await response.text()).slice(0, 256 * 1024);
    const results: WebSearchResult[] = [];
    for (const item of xml.match(/<item>[\s\S]*?<\/item>/gi) ?? []) {
      const title = xmlField(item, "title");
      const url = xmlField(item, "link");
      const snippet = xmlField(item, "description");
      if (!title || !url || !/^https?:\/\//i.test(url)) continue;
      results.push({ title, url, snippet });
      if (results.length >= MAX_SEARCH_RESULTS) break;
    }
    return { ok: true, results };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Timed out after 15s."
        : String(error instanceof Error ? error.message : error).slice(0, 200);
    return { ok: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}

export interface WebFetchResult {
  ok: boolean;
  text?: string;
  error?: string;
  url?: string;
}

export async function fetchPageText(url: string): Promise<WebFetchResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, error: "Only http/https URLs are allowed.", url };
    }
  } catch {
    return { ok: false, error: `Invalid URL: ${url.slice(0, 200)}`, url };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(parsed.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 InsChat/1.0",
        Accept: "text/html,application/json,text/plain;q=0.9,*/*;q=0.5",
        "Accept-Language": "en-US,en;q=0.8,zh-CN;q=0.6",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) {
      return {
        ok: false,
        error: `HTTP ${response.status} from ${parsed.host}`,
        url: parsed.toString(),
      };
    }
    const contentType = response.headers.get("content-type") ?? "";
    const bytes = new Uint8Array(
      Math.min(MAX_BYTES, Number(response.headers.get("content-length")) || MAX_BYTES)
    );
    let total = 0;
    const reader = response.body;
    if (!reader) {
      return { ok: false, error: "Empty response body.", url: parsed.toString() };
    }
    const chunks: Uint8Array[] = [];
    for await (const chunk of reader as unknown as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
      total += chunk.length;
      if (total > MAX_BYTES) break;
    }
    const raw = Buffer.concat(chunks).toString("utf8", 0, MAX_BYTES);

    let text: string;
    if (contentType.includes("json")) {
      text = raw;
    } else if (contentType.includes("html") || raw.includes("<")) {
      text = stripHtml(raw);
    } else {
      text = raw;
    }
    text = text.slice(0, MAX_TEXT);
    if (!text.trim()) {
      return { ok: false, error: "Page contained no readable text.", url: parsed.toString() };
    }
    return { ok: true, text, url: parsed.toString() };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Timed out after 15s."
        : String(error instanceof Error ? error.message : error).slice(0, 200);
    return { ok: false, error: message, url: parsed.toString() };
  } finally {
    clearTimeout(timer);
  }
}
