"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  Star,
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  MapPin,
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";
import type {
  GoogleMapsReview,
  SentimentType,
} from "@/lib/types";

// ─── Sentiment Badge ──────────────────────────────────────────────────────────
function SentimentBadge({ sentiment }: { sentiment: SentimentType | null }) {
  if (!sentiment) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-200/60 text-slate-500">
        <Minus className="w-3 h-3" />
        Belum
      </span>
    );
  }

  const config = {
    positive: {
      icon: TrendingUp,
      label: "Positif",
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      border: "border-emerald-200",
    },
    negative: {
      icon: TrendingDown,
      label: "Negatif",
      bg: "bg-red-100",
      text: "text-red-700",
      border: "border-red-200",
    },
    neutral: {
      icon: Minus,
      label: "Netral",
      bg: "bg-amber-100",
      text: "text-amber-700",
      border: "border-amber-200",
    },
  };

  const c = config[sentiment];
  const Icon = c.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${c.bg} ${c.text} ${c.border}`}
    >
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

// ─── Star Rating ──────────────────────────────────────────────────────────────
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i <= rating
              ? "fill-amber-400 text-amber-400"
              : "fill-slate-200 text-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Donut Chart (SVG) ────────────────────────────────────────────────────────
function DonutChart({
  positive,
  negative,
  neutral,
  total,
}: {
  positive: number;
  negative: number;
  neutral: number;
  total: number;
}) {
  const size = 160;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const posPercent = total > 0 ? positive / total : 0;
  const negPercent = total > 0 ? negative / total : 0;
  const neuPercent = total > 0 ? neutral / total : 0;

  const posArc = circumference * posPercent;
  const negArc = circumference * negPercent;
  const neuArc = circumference * neuPercent;

  const posOffset = 0;
  const negOffset = posArc;
  const neuOffset = posArc + negArc;

  return (
    <div className="relative">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-100"
        />
        {/* Positive (green) */}
        {posArc > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#10b981"
            strokeWidth={strokeWidth}
            strokeDasharray={`${posArc} ${circumference - posArc}`}
            strokeDashoffset={-posOffset}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        )}
        {/* Negative (red) */}
        {negArc > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#ef4444"
            strokeWidth={strokeWidth}
            strokeDasharray={`${negArc} ${circumference - negArc}`}
            strokeDashoffset={-negOffset}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        )}
        {/* Neutral (amber) */}
        {neuArc > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#f59e0b"
            strokeWidth={strokeWidth}
            strokeDasharray={`${neuArc} ${circumference - neuArc}`}
            strokeDashoffset={-neuOffset}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-light text-slate-800">
          {total}
        </span>
        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">
          Ulasan
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReviewsPage() {
  const { profile, isSuperAdmin, isAreaManager, activeStoreId } = useAuth();
  const effectiveStoreId = (isSuperAdmin || isAreaManager) ? activeStoreId : profile?.store_id;

  // State
  const [reviews, setReviews] = useState<GoogleMapsReview[]>([]);
  const [summary, setSummary] = useState({
    total_reviews: 0,
    positive_count: 0,
    negative_count: 0,
    neutral_count: 0,
    average_rating: 0,
  });
  const [mapsConfig, setMapsConfig] = useState<{
    google_maps_url: string;
    place_name: string | null;
    last_scraped_at: string | null;
  } | null>(null);
  const [serpApiQuota, setSerpApiQuota] = useState<{
    total_searches_left: number;
    searches_per_month: number;
  } | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<string>("");
  const [filterOpen, setFilterOpen] = useState(false);

  // Setup
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [showSetup, setShowSetup] = useState(false);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Fetch reviews data
  const fetchReviews = useCallback(
    async (page = 1) => {
      if (!effectiveStoreId) return;
      setLoading(true);

      const params = new URLSearchParams({
        store_id: effectiveStoreId,
        page: page.toString(),
        limit: "20",
      });
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
      if (sentimentFilter) params.set("sentiment", sentimentFilter);

      try {
        const res = await fetch(`/api/reviews/summary?${params}`);
        const data = await res.json();

        if (res.ok) {
          setReviews(data.reviews || []);
          setSummary(data.summary || summary);
          setMapsConfig(data.maps_config || null);
          setSerpApiQuota(data.serpapi_quota || null);
          setPagination(data.pagination || pagination);
          if (data.maps_config?.google_maps_url) {
            setGoogleMapsUrl(data.maps_config.google_maps_url);
          }
        }
      } catch (err) {
        console.error("Error fetching reviews:", err);
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effectiveStoreId, startDate, endDate, sentimentFilter]
  );

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Handle Scrape
  const handleScrape = async () => {
    if (!effectiveStoreId || !googleMapsUrl) return;
    setScraping(true);
    setScrapeResult(null);

    try {
      // Step 1: Scrape
      const scrapeRes = await fetch("/api/reviews/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: effectiveStoreId,
          google_maps_url: googleMapsUrl,
        }),
      });
      const scrapeData = await scrapeRes.json();

      if (!scrapeRes.ok) {
        setScrapeResult({
          type: "error",
          message: scrapeData.error || "Gagal scraping",
        });
        setScraping(false);
        return;
      }

      // Step 2: Analyze sentiment
      setAnalyzing(true);
      const analyzeRes = await fetch("/api/reviews/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: effectiveStoreId }),
      });
      const analyzeData = await analyzeRes.json();

      setScrapeResult({
        type: "success",
        message: `${scrapeData.total_scraped} ulasan di-scrape, ${analyzeData.analyzed || 0} dianalisis (${analyzeData.method || "auto"})`,
      });

      // Refresh data
      await fetchReviews();
      setShowSetup(false);
    } catch (err) {
      setScrapeResult({
        type: "error",
        message:
          err instanceof Error ? err.message : "Terjadi kesalahan",
      });
    } finally {
      setScraping(false);
      setAnalyzing(false);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Percentage calculations
  const posPercent =
    summary.total_reviews > 0
      ? Math.round((summary.positive_count / summary.total_reviews) * 100)
      : 0;
  const negPercent =
    summary.total_reviews > 0
      ? Math.round((summary.negative_count / summary.total_reviews) * 100)
      : 0;
  const neuPercent =
    summary.total_reviews > 0
      ? Math.round((summary.neutral_count / summary.total_reviews) * 100)
      : 0;

  if (loading && reviews.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#E5E9F0] p-4 sm:p-8 rounded-[2rem] font-sans -m-4 sm:-m-8">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 pt-4 px-2">
        <div>
          <h1 className="text-3xl font-semibold text-[#1E293B]">
            Ulasan Google Maps
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {mapsConfig?.place_name
              ? `📍 ${mapsConfig.place_name}`
              : "Analisis sentimen ulasan pelanggan"}
          </p>
          {mapsConfig?.last_scraped_at && (
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              Terakhir disinkronkan: {formatDateTime(mapsConfig.last_scraped_at)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {serpApiQuota && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/60 border border-slate-200/50 text-xs text-slate-600 shadow-sm">
              <span className={`w-2 h-2 rounded-full ${serpApiQuota.total_searches_left > 50 ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              Kuota Scrape: <strong className="text-slate-800">{serpApiQuota.total_searches_left}</strong> / {serpApiQuota.searches_per_month}
            </div>
          )}
          {mapsConfig?.google_maps_url && (
            <a
              href={mapsConfig.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/80 border border-slate-200/50 text-sm text-slate-600 hover:bg-white transition-all shadow-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Buka Maps
            </a>
          )}
          <button
            onClick={() => setShowSetup(!showSetup)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1E3A8A] text-white text-sm font-medium hover:bg-[#1e3a8a]/90 transition-all shadow-lg shadow-blue-500/20"
          >
            <Search className="w-4 h-4" />
            {mapsConfig ? "Scrape Ulasan Baru" : "Setup Google Maps"}
          </button>
        </div>
      </div>

      {/* ─── Scrape Result Toast ────────────────────────────────────── */}
      {scrapeResult && (
        <div
          className={`mb-6 mx-2 px-5 py-3.5 rounded-2xl flex items-center gap-3 text-sm font-medium shadow-md transition-all animate-in slide-in-from-top-4 fade-in duration-300 ${
            scrapeResult.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {scrapeResult.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          )}
          {scrapeResult.message}
          <button
            onClick={() => setScrapeResult(null)}
            className="ml-auto text-current opacity-50 hover:opacity-100"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── Setup Panel ────────────────────────────────────────────── */}
      {showSetup && (
        <div className="mx-2 mb-6 bg-white/90 backdrop-blur-md rounded-[2rem] p-6 shadow-lg border border-white/50 animate-in slide-in-from-top-4 fade-in duration-300">
          <h3 className="text-lg font-semibold text-slate-700 mb-1">
            Konfigurasi Google Maps
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Masukkan URL Google Maps toko Anda untuk mulai scraping ulasan
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="url"
                value={googleMapsUrl}
                onChange={(e) => setGoogleMapsUrl(e.target.value)}
                placeholder="https://maps.google.com/maps/place/..."
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
              />
            </div>
            <button
              onClick={handleScrape}
              disabled={scraping || !googleMapsUrl}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#1E3A8A] to-blue-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px]"
            >
              {scraping ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {analyzing ? "Menganalisis..." : "Scraping..."}
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Mulai Scraping
                </>
              )}
            </button>
          </div>

          <p className="text-[11px] text-slate-400 mt-3">
            💡 Tips: Buka Google Maps, cari toko Anda, lalu salin URL dari
            address bar browser.
          </p>
        </div>
      )}

      {/* ─── Stats Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mx-2">
        {/* Left: Donut Chart */}
        <div className="lg:col-span-4 bg-white/80 backdrop-blur-md rounded-[2rem] p-6 shadow-sm border border-white/50 flex flex-col items-center">
          <h3 className="text-lg font-medium text-slate-700 w-full mb-6">
            Distribusi Sentimen
          </h3>
          <DonutChart
            positive={summary.positive_count}
            negative={summary.negative_count}
            neutral={summary.neutral_count}
            total={summary.total_reviews}
          />
          <div className="flex flex-wrap gap-4 mt-6 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-600">
                Positif ({posPercent}%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs text-slate-600">
                Negatif ({negPercent}%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-xs text-slate-600">
                Netral ({neuPercent}%)
              </span>
            </div>
          </div>
        </div>

        {/* Right: Stats Grid */}
        <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total */}
          <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-5 shadow-sm border border-white/50 flex flex-col items-center justify-center">
            <MessageSquare className="w-6 h-6 text-slate-400 mb-2" />
            <span className="text-3xl font-light text-[#1E293B]">
              {summary.total_reviews}
            </span>
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mt-1">
              Total
            </span>
          </div>

          {/* Positive */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 backdrop-blur-md rounded-[2rem] p-5 shadow-sm border border-emerald-200/30 flex flex-col items-center justify-center">
            <TrendingUp className="w-6 h-6 text-emerald-500 mb-2" />
            <span className="text-3xl font-light text-emerald-700">
              {summary.positive_count}
            </span>
            <span className="text-[11px] text-emerald-500 font-semibold uppercase tracking-wider mt-1">
              Positif
            </span>
          </div>

          {/* Negative */}
          <div className="bg-gradient-to-br from-red-50 to-red-100/50 backdrop-blur-md rounded-[2rem] p-5 shadow-sm border border-red-200/30 flex flex-col items-center justify-center">
            <TrendingDown className="w-6 h-6 text-red-500 mb-2" />
            <span className="text-3xl font-light text-red-700">
              {summary.negative_count}
            </span>
            <span className="text-[11px] text-red-500 font-semibold uppercase tracking-wider mt-1">
              Negatif
            </span>
          </div>

          {/* Average Rating */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 backdrop-blur-md rounded-[2rem] p-5 shadow-sm border border-amber-200/30 flex flex-col items-center justify-center">
            <Star className="w-6 h-6 fill-amber-400 text-amber-400 mb-2" />
            <span className="text-3xl font-light text-amber-700">
              {summary.average_rating || "-"}
            </span>
            <span className="text-[11px] text-amber-500 font-semibold uppercase tracking-wider mt-1">
              Rata-rata
            </span>
          </div>

          {/* Date Range Filter */}
          <div className="col-span-2 md:col-span-4 bg-white/80 backdrop-blur-md rounded-[2rem] p-5 shadow-sm border border-white/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <Calendar className="w-4 h-4 text-slate-400" />
                Rentang Tanggal
              </div>
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                />
                <span className="text-slate-400 text-sm">—</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                />
                <div className="relative ml-auto">
                  <button
                    onClick={() => setFilterOpen(!filterOpen)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                      sentimentFilter
                        ? "bg-blue-50 border-blue-200 text-blue-600"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white"
                    }`}
                  >
                    <Filter className="w-3.5 h-3.5" />
                    {sentimentFilter
                      ? sentimentFilter === "positive"
                        ? "Positif"
                        : sentimentFilter === "negative"
                          ? "Negatif"
                          : "Netral"
                      : "Sentimen"}
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${filterOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {filterOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setFilterOpen(false)}
                      />
                      <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                        <button
                          onClick={() => {
                            setSentimentFilter("");
                            setFilterOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${!sentimentFilter ? "text-blue-600 font-semibold bg-blue-50" : "text-slate-700"}`}
                        >
                          Semua
                        </button>
                        {(
                          [
                            { key: "positive", label: "Positif", color: "🟢" },
                            { key: "negative", label: "Negatif", color: "🔴" },
                            { key: "neutral", label: "Netral", color: "🟡" },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.key}
                            onClick={() => {
                              setSentimentFilter(opt.key);
                              setFilterOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${sentimentFilter === opt.key ? "text-blue-600 font-semibold bg-blue-50" : "text-slate-700"}`}
                          >
                            {opt.color} {opt.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Reviews Table ─────────────────────────────────────────── */}
      <div className="mx-2 mt-6 bg-white/80 backdrop-blur-md rounded-[2rem] p-6 shadow-sm border border-white/50">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-medium text-slate-700">
              Daftar Ulasan
              <span className="ml-2 text-sm font-normal text-slate-400">
                ({pagination.total} ulasan)
              </span>
            </h3>
            {(startDate || endDate || sentimentFilter) && (
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setSentimentFilter("");
                }}
                className="text-xs px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors"
              >
                Reset Filter
              </button>
            )}
          </div>
          {loading && (
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          )}
        </div>

        {reviews.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">
              {mapsConfig
                ? "Belum ada ulasan untuk periode ini"
                : "Belum ada data ulasan"}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {mapsConfig
                ? "Coba ubah rentang tanggal atau filter sentimen"
                : 'Klik "Setup Google Maps" untuk mulai scraping ulasan'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Reviewer
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider w-[40%]">
                      Ulasan
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Sentimen
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Tanggal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((review) => (
                    <tr
                      key={review.id}
                      className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0">
                            {(review.reviewer_name || "?")[0].toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-700 truncate max-w-[120px]">
                            {review.reviewer_name || "Anonim"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StarRating rating={review.rating} />
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="text-slate-600 text-xs leading-relaxed line-clamp-2">
                          {review.review_text || (
                            <span className="italic text-slate-400">
                              Tidak ada teks ulasan
                            </span>
                          )}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <SentimentBadge
                          sentiment={review.sentiment as SentimentType | null}
                        />
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                        {formatDate(review.review_date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-600 font-bold text-xs">
                        {(review.reviewer_name || "?")[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-slate-700 truncate max-w-[120px]">
                        {review.reviewer_name || "Anonim"}
                      </span>
                    </div>
                    <SentimentBadge
                      sentiment={review.sentiment as SentimentType | null}
                    />
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <StarRating rating={review.rating} />
                    <span className="text-[11px] text-slate-400">
                      {formatDate(review.review_date)}
                    </span>
                  </div>
                  {review.review_text && (
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                      {review.review_text}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-400">
                  Halaman {pagination.page} dari {pagination.total_pages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchReviews(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => fetchReviews(pagination.page + 1)}
                    disabled={pagination.page >= pagination.total_pages}
                    className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Info Footer ───────────────────────────────────────────── */}
      <div className="mx-2 mt-6 bg-blue-50/50 rounded-[2rem] p-5 border border-blue-100/50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-700">
              Tentang Analisis Sentimen
            </p>
            <p className="text-xs text-blue-500 mt-1 leading-relaxed">
              Analisis sentimen menggunakan Google Cloud Natural Language API
              untuk mengkategorikan ulasan menjadi positif, negatif, atau
              netral. Jika API tidak tersedia, sistem akan menggunakan analisis
              berdasarkan rating bintang dan kata kunci.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
