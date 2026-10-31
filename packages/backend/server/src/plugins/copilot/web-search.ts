import { DebugLogger } from '@affine/debug';

const logger = new DebugLogger('affine:copilot:web-search');

export async function fetchLiveWebSearchResults(rawQuery: string): Promise<string> {
  if (!rawQuery) return '';

  // Extract clean query text
  const cleanQuery = rawQuery
    .replace(/^\[Web Search & Browsing Active:.*?\]\s*/gs, '')
    .replace(/^\[.*?\]\s*/gs, '')
    .trim();

  if (!cleanQuery) return '';

  logger.info('Fetching live web search results for query:', cleanQuery);

  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(cleanQuery)}&hl=en-US&gl=US&ceid=US:en`;
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      logger.warn(`Google News search request failed with status: ${response.status}`);
      return '';
    }

    const xml = await response.text();
    const items: string[] = [];
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];

    for (const itemXml of itemMatches.slice(0, 6)) {
      const titleMatch = itemXml.match(/<title>(.*?)<\/title>/i);
      const linkMatch = itemXml.match(/<link>(.*?)<\/link>/i);
      const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/i);
      const sourceMatch = itemXml.match(/<source[^>]*>(.*?)<\/source>/i);

      if (titleMatch && linkMatch) {
        const title = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim();
        const link = linkMatch[1].trim();
        const pubDate = pubDateMatch ? pubDateMatch[1].trim() : '';
        const source = sourceMatch ? sourceMatch[1].replace(/<[^>]+>/g, '').trim() : '';

        items.push(`• **[${title}](${link})** (${source || 'Web Source'}${pubDate ? ` - ${pubDate}` : ''})`);
      }
    }

    if (items.length > 0) {
      return `[REAL-TIME LIVE GOOGLE WEB SEARCH GROUNDING DATA - AUGUST 2026]\nSearch Query: "${cleanQuery}"\nLive Web & News Findings:\n${items.join('\n')}\n\n`;
    }
  } catch (err) {
    logger.error('Error fetching live web search results:', err);
  }

  return '';
}
