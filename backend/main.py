import logging
import os
import threading
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from database import (
    init_db, get_articles, get_outlets, get_stats,
    get_article_by_url, upsert_article, update_analysis,
    get_articles_by_author, get_similar_articles,
)
from scheduler import start_scheduler, stop_scheduler, run_refresh
from scraper import fetch_article_from_url
from analyzer import analyze_article

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title="News Bias Analyzer", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/articles")
def list_articles(
    outlet: str = Query(None),
    min_score: float = Query(-5, ge=-5, le=5),
    max_score: float = Query(5, ge=-5, le=5),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    return get_articles(outlet=outlet, min_score=min_score, max_score=max_score,
                        limit=limit, offset=offset)


@app.get("/api/outlets")
def list_outlets():
    return get_outlets()


@app.get("/api/stats")
def stats():
    return get_stats()


@app.post("/api/refresh")
def trigger_refresh():
    threading.Thread(target=run_refresh, daemon=True).start()
    return {"status": "refresh started"}


class AnalyzeUrlRequest(BaseModel):
    url: str


@app.post("/api/analyze-url")
def analyze_url(request: AnalyzeUrlRequest):
    url = request.url.strip()
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="URL must start with http:// or https://")

    existing = get_article_by_url(url)
    if existing and existing.get("analyzed_at"):
        return {"status": "existing", "article": existing}

    article_data = fetch_article_from_url(url)
    if not article_data:
        raise HTTPException(status_code=422, detail="Could not fetch or extract content from the URL. The site may block scrapers.")

    upsert_article(article_data)

    author_articles = get_articles_by_author(article_data.get("author"), url)
    similar = get_similar_articles(article_data["title"], article_data["outlet"], url)

    analysis = analyze_article(
        title=article_data["title"],
        body=article_data.get("body", ""),
        author=article_data.get("author"),
        author_articles=author_articles,
        similar_articles=similar,
    )

    if not analysis:
        raise HTTPException(status_code=500, detail="AI analysis failed. Please try again.")

    update_analysis(url, analysis)

    full_article = get_article_by_url(url)
    return {"status": "new", "article": full_article}
