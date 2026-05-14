import feedparser
import trafilatura
import requests
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

NEWS_SOURCES = [
    {"name": "Fox News", "rss": "https://feeds.foxnews.com/foxnews/politics"},
    {"name": "CNN", "rss": "http://rss.cnn.com/rss/cnn_allpolitics.rss"},
    {"name": "NBC News", "rss": "https://feeds.nbcnews.com/nbcnews/public/politics"},
    {"name": "ABC News", "rss": "https://abcnews.go.com/abcnews/politicsheadlines"},
    {"name": "NPR", "rss": "https://feeds.npr.org/1014/rss.xml"},
    {"name": "Reuters", "rss": "https://feeds.reuters.com/reuters/politicsNews"},
    {"name": "The Hill", "rss": "https://thehill.com/rss/syndicator/19110"},
    {"name": "Politico", "rss": "https://rss.politico.com/politics-news.xml"},
    {"name": "Washington Post", "rss": "https://feeds.washingtonpost.com/rss/politics"},
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; NewsBiasAnalyzer/1.0)"
}


def fetch_article_body(url: str) -> str:
    try:
        downloaded = trafilatura.fetch_url(url)
        if downloaded:
            text = trafilatura.extract(downloaded, include_comments=False, include_tables=False)
            if text:
                return text[:8000]
    except Exception as e:
        logger.warning("trafilatura failed for %s: %s", url, e)

    # Fallback: raw requests
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        resp.raise_for_status()
        text = trafilatura.extract(resp.text, include_comments=False, include_tables=False)
        return (text or "")[:8000]
    except Exception as e:
        logger.warning("fallback fetch failed for %s: %s", url, e)
        return ""


def fetch_feed(source: dict, max_articles: int = 10) -> list[dict]:
    articles = []
    try:
        feed = feedparser.parse(source["rss"])
        now = datetime.now(timezone.utc).isoformat()

        for entry in feed.entries[:max_articles]:
            url = entry.get("link", "")
            if not url:
                continue

            published_at = None
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                try:
                    published_at = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc).isoformat()
                except Exception:
                    pass

            # Extract author — RSS feeds use various fields
            author = None
            if hasattr(entry, "author") and entry.author:
                author = entry.author.strip()
            elif hasattr(entry, "authors") and entry.authors:
                author = entry.authors[0].get("name", "").strip() or None

            body = fetch_article_body(url)

            articles.append({
                "url": url,
                "title": entry.get("title", "").strip(),
                "outlet": source["name"],
                "author": author,
                "published_at": published_at,
                "body": body,
                "fetched_at": now,
            })
    except Exception as e:
        logger.error("Error fetching feed %s: %s", source["name"], e)

    return articles


def fetch_all_feeds(max_articles_per_source: int = 10) -> list[dict]:
    all_articles = []
    for source in NEWS_SOURCES:
        logger.info("Fetching %s...", source["name"])
        articles = fetch_feed(source, max_articles_per_source)
        logger.info("  Got %d articles from %s", len(articles), source["name"])
        all_articles.extend(articles)
    return all_articles
