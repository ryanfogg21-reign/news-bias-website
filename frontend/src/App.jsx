import { useState, useEffect, useCallback } from "react";
import Header from "./components/Header.jsx";
import FilterPanel from "./components/FilterPanel.jsx";
import ArticleCard from "./components/ArticleCard.jsx";
import UrlAnalyzer from "./components/UrlAnalyzer.jsx";

const API_BASE = (typeof __API_URL__ !== "undefined" && __API_URL__) ? __API_URL__ : "";

const DEFAULT_FILTERS = { outlet: null, minScore: -5, maxScore: 5 };

export default function App() {
  const [articles, setArticles] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchArticles = useCallback(async (f = filters) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ min_score: f.minScore, max_score: f.maxScore, limit: 100 });
      if (f.outlet) params.set("outlet", f.outlet);
      const res = await fetch(`${API_BASE}/api/articles?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setArticles(await res.json());
    } catch (e) {
      setError("Could not load articles. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchMeta = useCallback(async () => {
    try {
      const [outletsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/outlets`),
        fetch(`${API_BASE}/api/stats`),
      ]);
      setOutlets(await outletsRes.json());
      setStats(await statsRes.json());
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    fetchArticles(filters);
    fetchMeta();
  }, []);

  const handleFilterChange = (patch) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    fetchArticles(next);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch(`${API_BASE}/api/refresh`, { method: "POST" });
      setTimeout(async () => {
        await fetchArticles(filters);
        await fetchMeta();
        setRefreshing(false);
      }, 5000);
    } catch {
      setRefreshing(false);
    }
  };

  const handleArticleFound = (article, status) => {
    if (status === "new") {
      setArticles(prev => {
        if (prev.find(a => a.id === article.id || a.url === article.url)) return prev;
        return [article, ...prev];
      });
      fetchMeta();
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <Header stats={stats} onRefresh={handleRefresh} refreshing={refreshing} />

      <div style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "240px 1fr",
        gap: 24,
        padding: 24,
        maxWidth: 1400,
        margin: "0 auto",
        width: "100%",
      }}>
        <FilterPanel outlets={outlets} filters={filters} onChange={handleFilterChange} />

        <main>
          <UrlAnalyzer apiBase={API_BASE} onArticleFound={handleArticleFound} />

          {error && (
            <div style={{
              background: "#fef2f2",
              border: "1px solid #fca5a5",
              borderRadius: 8,
              padding: 16,
              color: "#b91c1c",
              marginBottom: 16,
              fontSize: 13,
            }}>
              {error}
            </div>
          )}

          {!error && !loading && articles.length === 0 && (
            <EmptyState />
          )}

          {loading ? (
            <div style={{ color: "var(--text-muted)", padding: 32, textAlign: "center", fontSize: 14 }}>
              Loading articles…
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 2, fontWeight: 500 }}>
                {articles.length} article{articles.length !== 1 ? "s" : ""}
                {filters.outlet ? ` from ${filters.outlet}` : " across all outlets"}
              </p>
              {articles.map(a => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{
      textAlign: "center",
      padding: "64px 24px",
      color: "var(--text-muted)",
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📰</div>
      <h2 style={{ fontSize: 18, marginBottom: 8, color: "var(--text)" }}>No articles yet</h2>
      <p style={{ fontSize: 14, maxWidth: 380, margin: "0 auto", lineHeight: 1.6 }}>
        The backend is fetching and analyzing articles in the background.
        This may take a few minutes on first run. Hit <strong>↺ Refresh Feeds</strong> to check for updates,
        or paste a URL above to analyze an article on demand.
      </p>
    </div>
  );
}
