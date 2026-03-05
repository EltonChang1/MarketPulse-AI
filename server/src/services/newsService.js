import Parser from "rss-parser";

const parser = new Parser();

export async function fetchLatestNews(companyName, symbol, maxItems = 6) {
  const query = encodeURIComponent(`${companyName} ${symbol} stock`);
  const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;

  const feed = await parser.parseURL(rssUrl);
  const items = (feed.items || []).slice(0, maxItems).map((item) => ({
    title: item.title || "Untitled",
    link: item.link || "",
    pubDate: item.pubDate || null,
    source: item.source || feed.title || "Google News",
  }));

  return items;
}
