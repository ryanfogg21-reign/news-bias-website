import re
import os
from contextlib import contextmanager

import psycopg2
import psycopg2.pool
from psycopg2.extras import RealDictCursor

_pool: psycopg2.pool.ThreadedConnectionPool | None = None

STOP_WORDS = {
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "to", "of", "in", "on", "at",
    "by", "for", "with", "about", "as", "into", "through", "during", "before",
    "after", "above", "below", "from", "up", "down", "out", "over", "under",
    "again", "then", "and", "or", "but", "not", "no", "its", "it", "this",
    "that", "these", "those", "he", "she", "they", "we", "you", "i", "my",
    "his", "her", "their", "our", "your", "says", "said", "new", "just",
    "more", "also", "after", "than", "what", "who", "how", "when", "why",
}


def extract_keywords(title: str) -> set[str]:
    words = re.findall(r"\b[a-z]{3,}\b", title.lower())
    return {w for w in words if w not in STOP_WORDS}


def init_db():
    global _pool
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL environment variable is not set")

    _pool = psycopg2.pool.ThreadedConnectionPool(1, 5, db_url)

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS articles (
                    id               SERIAL PRIMARY KEY,
                    url              TEXT UNIQUE NOT NULL,
                    title            TEXT NOT NULL,
                    outlet           TEXT NOT NULL,
                    author           TEXT,
                    published_at     TEXT,
                    body             TEXT,
                    headline_score   DOUBLE PRECISION,
                    body_score       DOUBLE PRECISION,
                    overall_score    DOUBLE PRECISION,
                    headline_explanation  TEXT,
                    body_explanation      TEXT,
                    author_pattern_note   TEXT,
                    cross_outlet_note     TEXT,
                    analyzed_at      TEXT,
                    fetched_at       TEXT NOT NULL
                )
            """)
            # Safe migration — adds columns if they don't exist yet
            for col, coltype in [
                ("author", "TEXT"),
                ("author_pattern_note", "TEXT"),
                ("cross_outlet_note", "TEXT"),
                ("biased_quotes", "TEXT"),
            ]:
                cur.execute(
                    f"ALTER TABLE articles ADD COLUMN IF NOT EXISTS {col} {coltype}"
                )
        conn.commit()


@contextmanager
def get_db():
    conn = _pool.getconn()
    try:
        yield conn
    except Exception:
        conn.rollback()
        raise
    finally:
        _pool.putconn(conn)


def upsert_article(article: dict):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO articles (url, title, outlet, author, published_at, body, fetched_at)
                VALUES (%(url)s, %(title)s, %(outlet)s, %(author)s, %(published_at)s, %(body)s, %(fetched_at)s)
                ON CONFLICT (url) DO NOTHING
            """, article)
        conn.commit()


def update_analysis(url: str, analysis: dict):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE articles
                SET headline_score       = %(headline_score)s,
                    body_score           = %(body_score)s,
                    overall_score        = %(overall_score)s,
                    headline_explanation = %(headline_explanation)s,
                    body_explanation     = %(body_explanation)s,
                    author_pattern_note  = %(author_pattern_note)s,
                    cross_outlet_note    = %(cross_outlet_note)s,
                    biased_quotes        = %(biased_quotes)s,
                    analyzed_at          = %(analyzed_at)s
                WHERE url = %(url)s
            """, {**analysis, "url": url})
        conn.commit()


def get_articles(outlet: str = None, min_score: float = -5, max_score: float = 5,
                 limit: int = 50, offset: int = 0) -> list[dict]:
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = """
                SELECT * FROM articles
                WHERE analyzed_at IS NOT NULL
                  AND overall_score BETWEEN %s AND %s
            """
            params: list = [min_score, max_score]

            if outlet:
                query += " AND outlet = %s"
                params.append(outlet)

            query += " ORDER BY fetched_at DESC LIMIT %s OFFSET %s"
            params.extend([limit, offset])

            cur.execute(query, params)
            return [dict(row) for row in cur.fetchall()]


def get_unanalyzed_articles() -> list[dict]:
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM articles WHERE analyzed_at IS NULL")
            return [dict(row) for row in cur.fetchall()]


def get_articles_by_author(author: str, exclude_url: str, limit: int = 5) -> list[dict]:
    if not author:
        return []
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT title, outlet, overall_score FROM articles
                WHERE author = %s AND url != %s AND analyzed_at IS NOT NULL
                ORDER BY fetched_at DESC LIMIT %s
            """, (author, exclude_url, limit))
            return [dict(row) for row in cur.fetchall()]


def get_similar_articles(title: str, exclude_outlet: str, exclude_url: str,
                         limit: int = 4) -> list[dict]:
    keywords = extract_keywords(title)
    if len(keywords) < 2:
        return []

    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT title, outlet, overall_score FROM articles
                WHERE outlet != %s AND url != %s AND analyzed_at IS NOT NULL
                ORDER BY fetched_at DESC LIMIT 200
            """, (exclude_outlet, exclude_url))
            rows = cur.fetchall()

    scored = []
    for row in rows:
        overlap = len(keywords & extract_keywords(row["title"]))
        if overlap >= 2:
            scored.append((overlap, dict(row)))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [item for _, item in scored[:limit]]


def get_article_by_url(url: str) -> dict | None:
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM articles WHERE url = %s", (url,))
            row = cur.fetchone()
            return dict(row) if row else None


def get_outlets() -> list[str]:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT DISTINCT outlet FROM articles ORDER BY outlet")
            return [row[0] for row in cur.fetchall()]


def get_stats() -> dict:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM articles WHERE analyzed_at IS NOT NULL")
            total = cur.fetchone()[0]

            cur.execute("""
                SELECT outlet, COUNT(*) as count, AVG(overall_score) as avg_score
                FROM articles
                WHERE analyzed_at IS NOT NULL
                GROUP BY outlet
                ORDER BY outlet
            """)
            rows = cur.fetchall()

        return {
            "total_analyzed": total,
            "by_outlet": [
                {"outlet": r[0], "count": r[1], "avg_score": round(r[2], 2) if r[2] else None}
                for r in rows
            ],
        }
