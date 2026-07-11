import { type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client with service role for API routes
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anonKey);
}

// Extract Place ID from Google Maps URL patterns
function extractPlaceId(url: string): string | null {
  // Pattern: /place/.../@lat,lng,zoom/data=...!1s0x...!...
  // Or: ?cid=...
  // Or: place_id=...
  const placeIdMatch = url.match(/place_id[=:]([A-Za-z0-9_-]+)/);
  if (placeIdMatch) return placeIdMatch[1];

  // ChIJ pattern in data parameter
  const chiJMatch = url.match(/!1s(0x[a-f0-9]+:[a-f0-9]+)/);
  if (chiJMatch) return chiJMatch[1];

  return null;
}

// Generate a unique review ID for deduplication
function generateReviewId(
  reviewerName: string,
  reviewText: string,
  rating: number
): string {
  const raw = `${reviewerName}-${rating}-${(reviewText || "").slice(0, 50)}`;
  // Simple hash
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `gmr_${Math.abs(hash).toString(36)}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { store_id, google_maps_url } = body;

    if (!store_id || !google_maps_url) {
      return Response.json(
        { error: "store_id dan google_maps_url diperlukan" },
        { status: 400 }
      );
    }

    const serpApiKey = process.env.SERPAPI_API_KEY;
    if (!serpApiKey) {
      return Response.json(
        {
          error:
            "SERPAPI_API_KEY belum dikonfigurasi. Tambahkan di .env.local",
        },
        { status: 500 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Extract or use provided Place ID
    let placeId = extractPlaceId(google_maps_url);

    // Step 1: If no place_id extracted, search for the place first
    if (!placeId) {
      // Extract place name from URL
      const placeNameMatch = google_maps_url.match(
        /place\/([^/@]+)/
      );
      const searchQuery = placeNameMatch
        ? decodeURIComponent(placeNameMatch[1].replace(/\+/g, " "))
        : google_maps_url;

      // Use SerpAPI Google Maps search to find place_id
      const searchUrl = new URL("https://serpapi.com/search.json");
      searchUrl.searchParams.set("engine", "google_maps");
      searchUrl.searchParams.set("q", searchQuery);
      searchUrl.searchParams.set("type", "search");
      searchUrl.searchParams.set("api_key", serpApiKey);

      const searchRes = await fetch(searchUrl.toString());
      const searchData = await searchRes.json();

      if (
        searchData.local_results &&
        searchData.local_results.length > 0
      ) {
        placeId = searchData.local_results[0].place_id || null;
      }

      if (!placeId) {
        return Response.json(
          {
            error:
              "Tidak dapat menemukan Place ID dari URL. Pastikan URL Google Maps valid.",
          },
          { status: 400 }
        );
      }
    }

    // Step 2: Fetch reviews using SerpAPI Google Maps Reviews
    const reviewsUrl = new URL("https://serpapi.com/search.json");
    reviewsUrl.searchParams.set("engine", "google_maps_reviews");
    reviewsUrl.searchParams.set("place_id", placeId);
    reviewsUrl.searchParams.set("sort_by", "newestFirst");
    reviewsUrl.searchParams.set("hl", "id"); // Indonesian language
    reviewsUrl.searchParams.set("api_key", serpApiKey);

    const reviewsRes = await fetch(reviewsUrl.toString());
    const reviewsData = await reviewsRes.json();

    if (!reviewsData.reviews || reviewsData.reviews.length === 0) {
      // Save the Google Maps config even if no reviews found
      await supabase.from("store_google_maps").upsert(
        {
          store_id,
          google_maps_url,
          place_id: placeId,
          place_name: reviewsData.place_info?.title || null,
          last_scraped_at: new Date().toISOString(),
        },
        { onConflict: "store_id" }
      );

      return Response.json({
        message: "Tidak ada ulasan ditemukan untuk tempat ini",
        total_scraped: 0,
        place_name: reviewsData.place_info?.title || null,
      });
    }

    // Step 3: Transform and save reviews
    const reviews = reviewsData.reviews.map(
      (r: {
        user?: { name?: string };
        rating?: number;
        snippet?: string;
        date?: string;
        iso_date_of_last_edit?: string;
        iso_date?: string;
      }) => ({
        store_id,
        reviewer_name: r.user?.name || "Anonim",
        review_text: r.snippet || null,
        rating: r.rating || 0,
        review_date:
          r.iso_date_of_last_edit || r.iso_date || null,
        sentiment: null, // Will be filled by analyze endpoint
        sentiment_score: null,
        scraped_at: new Date().toISOString(),
        google_review_id: generateReviewId(
          r.user?.name || "anon",
          r.snippet || "",
          r.rating || 0
        ),
      })
    );

    // Upsert reviews (skip duplicates based on google_review_id)
    const { data: insertedReviews, error: insertError } = await supabase
      .from("google_maps_reviews")
      .upsert(reviews, {
        onConflict: "google_review_id",
        ignoreDuplicates: true,
      })
      .select();

    if (insertError) {
      console.error("Error inserting reviews:", insertError);
      return Response.json(
        { error: "Gagal menyimpan ulasan: " + insertError.message },
        { status: 500 }
      );
    }

    // Step 4: Update store_google_maps config
    await supabase.from("store_google_maps").upsert(
      {
        store_id,
        google_maps_url,
        place_id: placeId,
        place_name:
          reviewsData.place_info?.title ||
          reviewsData.search_information?.query_displayed ||
          null,
        last_scraped_at: new Date().toISOString(),
      },
      { onConflict: "store_id" }
    );

    return Response.json({
      message: `Berhasil scraping ${reviews.length} ulasan`,
      total_scraped: reviews.length,
      total_inserted: insertedReviews?.length || 0,
      place_id: placeId,
      place_name: reviewsData.place_info?.title || null,
    });
  } catch (error) {
    console.error("Scrape error:", error);
    return Response.json(
      {
        error:
          "Terjadi kesalahan saat scraping: " +
          (error instanceof Error ? error.message : "Unknown error"),
      },
      { status: 500 }
    );
  }
}
