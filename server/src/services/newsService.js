import Parser from "rss-parser";

const parser = new Parser();
const ARTICLE_FETCH_TIMEOUT_MS = 8000;
const MAX_ARTICLE_CHARS = 6000;
const articleCache = new Map();
const NON_TEXT_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|ico|bmp|tiff?|avif|mp4|mov|m4v|webm|mp3|wav|pdf|zip)(\?|$)/i;

function hasBinarySignature(text = "") {
  const sample = String(text || "").slice(0, 200);
  return /\uFFFD|\x00|‰PNG|PNG\s*IHDR|JFIF|IEND\uFFFD|RIFF|WEBP/i.test(sample);
}

function isLikelyReadableText(text = "") {
  const value = String(text || "").trim();
  if (!value || value.length < 120) return false;
  if (hasBinarySignature(value)) return false;

  const letters = (value.match(/[A-Za-z]/g) || []).length;
  const printable = (value.match(/[\x20-\x7E\n\r\t]/g) || []).length;
  if (letters < 60) return false;
  return printable / value.length > 0.85;
}

function stripHtml(html = "") {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(text = "", maxChars = MAX_ARTICLE_CHARS) {
  const normalized = String(text || "").trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars)}...`;
}

function extractJsonLdArticleBody(html = "") {
  const scripts = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];
  for (const script of scripts) {
    const raw = script.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "").trim();
    try {
      const parsed = JSON.parse(raw);
      const nodes = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.["@graph"])
          ? parsed["@graph"]
          : [parsed];
      for (const node of nodes) {
        const articleBody = node?.articleBody || node?.description;
        if (typeof articleBody === "string" && articleBody.trim().length > 200) {
          return articleBody.trim();
        }
      }
    } catch {
      continue;
    }
  }
  return "";
}

function extractParagraphText(html = "") {
  const paragraphMatches = html.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || [];
  const paragraphs = paragraphMatches
    .map((paragraph) => stripHtml(paragraph))
    .filter((paragraph) => paragraph.length > 80);
  return paragraphs.slice(0, 20).join(" ");
}

function extractMetaDescription(html = "") {
  const metaPatterns = [
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i,
    /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i,
  ];

  for (const pattern of metaPatterns) {
    const match = html.match(pattern);
    const value = stripHtml(match?.[1] || "");
    if (value.length > 120 && !hasBinarySignature(value)) {
      return value;
    }
  }

  return "";
}

function chooseBestArticleText(html = "") {
  const fromJsonLd = extractJsonLdArticleBody(html);
  if (isLikelyReadableText(fromJsonLd)) return fromJsonLd;

  const fromMeta = extractMetaDescription(html);
  if (fromMeta) return fromMeta;

  const fromParagraphs = extractParagraphText(html);
  if (isLikelyReadableText(fromParagraphs)) return fromParagraphs;

  const stripped = stripHtml(html);
  if (isLikelyReadableText(stripped)) return stripped;

  return "";
}

async function fetchUrl(url) {
  if (NON_TEXT_EXTENSIONS.test(url)) {
    return {
      ok: false,
      finalUrl: url,
      status: 415,
      contentType: "application/octet-stream",
      html: "",
    };
  }

  const response = await fetch(url, {
    method: "GET",
    redirect: "follow",
    signal: AbortSignal.timeout(ARTICLE_FETCH_TIMEOUT_MS),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  const contentType = response.headers.get("content-type") || "";
  if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
    return {
      ok: response.ok,
      finalUrl: response.url,
      status: response.status,
      contentType,
      html: "",
    };
  }

  const html = await response.text();
  return {
    ok: response.ok,
    finalUrl: response.url,
    status: response.status,
    contentType,
    html,
  };
}

function findExternalUrlInGoogleNewsHtml(html = "") {
  const candidates = html.match(/https?:\/\/[^\s"'<>]+/g) || [];
  return candidates.find((candidate) => {
    try {
      const url = new URL(candidate);
      if (url.hostname.includes("google.com") || url.hostname.includes("gstatic.com")) {
        return false;
      }
      if (NON_TEXT_EXTENSIONS.test(url.pathname)) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  });
}

async function resolveAndExtractArticle(link = "") {
  if (!link) {
    return { articleUrl: "", articleContent: "", extractionStatus: "no-link" };
  }

  if (articleCache.has(link)) {
    return articleCache.get(link);
  }

  try {
    const firstFetch = await fetchUrl(link);
    let resolvedUrl = firstFetch.finalUrl || link;
    let html = firstFetch.html || "";

    const host = (() => {
      try {
        return new URL(resolvedUrl).hostname;
      } catch {
        return "";
      }
    })();

    if (host.includes("news.google.com")) {
      const externalUrl = findExternalUrlInGoogleNewsHtml(html);
      if (externalUrl) {
        const secondFetch = await fetchUrl(externalUrl);
        resolvedUrl = secondFetch.finalUrl || externalUrl;
        html = secondFetch.html || html;
      }
    }

    const articleContent = truncateText(chooseBestArticleText(html));
    const result = {
      articleUrl: resolvedUrl,
      articleContent,
      extractionStatus: articleContent.length > 200 ? "ok" : "limited",
    };
    articleCache.set(link, result);
    return result;
  } catch {
    const fallback = { articleUrl: link, articleContent: "", extractionStatus: "failed" };
    articleCache.set(link, fallback);
    return fallback;
  }
}

export async function fetchLatestNews(companyName, symbol, maxItems = 6) {
  const query = encodeURIComponent(`${companyName} ${symbol} stock`);
  const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;

  const feed = await parser.parseURL(rssUrl);
  const baseItems = (feed.items || []).slice(0, maxItems).map((item) => ({
    title: item.title || "Untitled",
    contentSnippet: item.contentSnippet || item.content || item.summary || "",
    description: item.contentSnippet || item.content || item.summary || "",
    link: item.link || "",
    pubDate: item.pubDate || null,
    source: item.source || feed.title || "Google News",
  }));

  const enriched = await Promise.all(
    baseItems.map(async (item, index) => {
      if (index >= 10) {
        return {
          ...item,
          articleUrl: item.link,
          articleContent: "",
          extractionStatus: "skipped",
        };
      }

      const extracted = await resolveAndExtractArticle(item.link);
      return {
        ...item,
        articleUrl: extracted.articleUrl || item.link,
        articleContent: extracted.articleContent || "",
        extractionStatus: extracted.extractionStatus,
      };
    })
  );

  return enriched;
}
