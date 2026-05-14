import re
import sqlite3
import os
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(__file__), "articles.db")

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
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS articles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                outlet TEXT NOT NULL,
                author TEXT,
                published_at TEXT,
                body TEXT,
                headline_score REAL,
                body_score REAL,
                overall_score REAL,
                headline_explanation TEXT,
                body_explanation TEXT,
                author_pattern_note TEXT,
                cross_outlet_note TEXT,
                analyzed_at TEXT,
                fetched_at TEXT NOT NULL
            )
        """)
        conn.commit()

    # Safe migration for databases created before these columns existed
    _add_column_if_missing("author", "TEXT")
    _add_column_if_missing("author_pattern_note", "TEXT")
    _add_column_if_missing("cross_outlet_note", "TEXT")


def _add_column_if_missing(column: str, col_type: str):
    with get_db() as conn:
        cols = [row[1] for row in conn.execute("PRAGMA table_info(articles)").fetchall()]
        if column not in cols:
            conn.execute(f"ALTER TABLE articles ADD COLUMN {column} {col_type}")
            conn.commit()


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def upsert_article(article: dict):
    with get_db() as conn:
        conn.execute("""
            INSERT INTO articles (url, title, outlet, author, published_at, body, fetched_at)
            VALUES (:url, :title, :outlet, :author, :published_at, :body, :fetched_at)
            ON CONFLICT(url) DO NOTHING
        """, article)
        conn.commit()


def update_analysis(url: str, analysis: dict):
    with get_db() as conn:
        conn.execute("""
            UPDATE articles
            SET headline_score      = :headline_score,
                body_score          = :body_score,
                overall_score       = :overall_score,
                headline_explanation = :headline_explanation,
                body_explanation    = :body_explanation,
                author_pattern_note = :author_pattern_note,
                cross_outlet_note   = :cross_outlet_note,
                analyzed_at         = :analyzed_at
            WHERE url = :url
        """, {**analysis, "url": url})
        conn.commit()


def get_articles(outlet: str = None, min_score: float = -5, max_score: float = 5,
                 limit: int = 50, offset: int = 0) -> list[dict]:
    with get_db() as conn:
        query = """
            SELECT * FROM articles
            WHERE analyzed_at IS NOT NULL
              AND overall_score BETWEEN ? AND ?
        """
        params: list = [min_score, max_score]

        if outlet:
            query += " AND outlet = ?"
            params.append(outlet)

        query += " ORDER BY fetched_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        rows = conn.execute(query, params).fetchall()
        return [dict(row) for row in rows]


def get_unanalyzed_articles() -> list[dict]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM articles WHERE analyzed_at IS NULL"
        ).fetchall()
        return [dict(row) for row in rows]


def get_articles_by_author(author: str, exclude_url: str, limit: int = 5) -> list[dict]:
    if not author:
        return []
    with get_db() as conn:
        rows = conn.execute("""
            SELECT title, outlet, overall_score FROM articles
            WHERE author = ? AND url != ? AND analyzed_at IS NOT NULL
            ORDER BY fetched_at DESC LIMIT ?
        """, (author, exclude_url, limit)).fetchall()
        return [dict(row) for row in rows]


def get_similar_articles(title: str, exclude_outlet: str, exclude_url: str,
                         limit: int = 4) -> list[dict]:
    """Find analyzed articles from other outlets covering a similar topic via keyword overlap."""
    keywords = extract_keywords(title)
    if len(keywords) < 2:
        return []

    with get_db() as conn:
        rows = conn.execute("""
            SELECT title, outlet, overall_score FROM articles
            WHERE outlet != ? AND url != ? AND analyzed_at IS NOT NULL
            ORDER BY fetched_at DESC LIMIT 200
        """, (exclude_outlet, exclude_url)).fetchall()

    scored = []
    for row in rows:
        overlap = len(keywords & extract_keywords(row["title"]))
        if overlap >= 2:
            scored.append((overlap, dict(row)))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [item for _, item in scored[:limit]]


def get_outlets() -> list[str]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT DISTINCT outlet FROM articles ORDER BY outlet"
        ).fetchall()
        return [row["outlet"] for row in rows]


def get_stats() -> dict:
    with get_db() as conn:
        total = conn.execute(
            "SELECT COUNT(*) FROM articles WHERE analyzed_at IS NOT NULL"
        ).fetchone()[0]

        outlet_rows = conn.execute("""
            SELECT outlet, COUNT(*) as count, AVG(overall_score) as avg_score
            FROM articles
            WHERE analyzed_at IS NOT NULL
            GROUP BY outlet
            ORDER BY outlet
        """).fetchall()

        return {
            "total_analyzed": total,
            "by_outlet": [dict(row) for row in outlet_rows],
        }
