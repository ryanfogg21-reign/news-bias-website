import logging
import os
import threading
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from database import init_db, get_articles, get_outlets, get_stats
from scheduler import start_scheduler, stop_scheduler, run_refresh

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
    allow_origins=["http://localhost:5173", "http://localhost:4173"],
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
