import logging
import os
from apscheduler.schedulers.background import BackgroundScheduler
from database import (upsert_article, update_analysis, get_unanalyzed_articles,
                      get_articles_by_author, get_similar_articles)
from scraper import fetch_all_feeds
from analyzer import analyze_article

logger = logging.getLogger(__name__)
_scheduler = BackgroundScheduler()


def run_refresh():
    max_per_source = int(os.getenv("MAX_ARTICLES_PER_SOURCE", "10"))
    logger.info("Starting article refresh (max %d per source)...", max_per_source)

    articles = fetch_all_feeds(max_per_source)
    logger.info("Fetched %d articles total", len(articles))

    for article in articles:
        upsert_article(article)

    unanalyzed = get_unanalyzed_articles()
    logger.info("Analyzing %d new articles...", len(unanalyzed))

    for article in unanalyzed:
        author_articles = get_articles_by_author(
            article.get("author"), exclude_url=article["url"]
        )
        similar_articles = get_similar_articles(
            article["title"],
            exclude_outlet=article["outlet"],
            exclude_url=article["url"],
        )

        result = analyze_article(
            title=article["title"],
            body=article["body"] or "",
            author=article.get("author"),
            author_articles=author_articles,
            similar_articles=similar_articles,
        )

        if result:
            update_analysis(article["url"], result)
            logger.info(
                "  [%s] %s — %s",
                f"{'+' if result['overall_score'] > 0 else ''}{result['overall_score']:.1f}",
                article["outlet"],
                article["title"][:60],
            )

    logger.info("Refresh complete.")


def start_scheduler():
    interval_minutes = int(os.getenv("REFRESH_INTERVAL_MINUTES", "60"))
    _scheduler.add_job(run_refresh, "interval", minutes=interval_minutes, id="refresh")
    _scheduler.start()
    logger.info("Scheduler started (every %d minutes)", interval_minutes)

    import threading
    threading.Thread(target=run_refresh, daemon=True).start()


def stop_scheduler():
    if _scheduler.running:
        _scheduler.shutdown()
