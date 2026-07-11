import { type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anonKey);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const store_id = searchParams.get("store_id");
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");
    const sentiment = searchParams.get("sentiment"); // optional filter
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!store_id) {
      return Response.json(
        { error: "store_id diperlukan" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Build query for reviews
    let reviewsQuery = supabase
      .from("google_maps_reviews")
      .select("*", { count: "exact" })
      .eq("store_id", store_id)
      .order("review_date", { ascending: false, nullsFirst: false });

    // Apply date range filter
    if (start_date) {
      reviewsQuery = reviewsQuery.gte(
        "review_date",
        `${start_date}T00:00:00.000Z`
      );
    }
    if (end_date) {
      reviewsQuery = reviewsQuery.lte(
        "review_date",
        `${end_date}T23:59:59.999Z`
      );
    }

    // Apply sentiment filter
    if (sentiment && ["positive", "negative", "neutral"].includes(sentiment)) {
      reviewsQuery = reviewsQuery.eq("sentiment", sentiment);
    }

    // Pagination
    const offset = (page - 1) * limit;
    reviewsQuery = reviewsQuery.range(offset, offset + limit - 1);

    const { data: reviews, count, error: reviewsError } = await reviewsQuery;

    if (reviewsError) {
      return Response.json(
        { error: "Gagal mengambil ulasan: " + reviewsError.message },
        { status: 500 }
      );
    }

    // Build query for sentiment counts (across the same date range, without pagination)
    let countQuery = supabase
      .from("google_maps_reviews")
      .select("sentiment, rating")
      .eq("store_id", store_id)
      .not("sentiment", "is", null);

    if (start_date) {
      countQuery = countQuery.gte(
        "review_date",
        `${start_date}T00:00:00.000Z`
      );
    }
    if (end_date) {
      countQuery = countQuery.lte(
        "review_date",
        `${end_date}T23:59:59.999Z`
      );
    }

    const { data: allFiltered } = await countQuery;

    // Calculate summary stats
    const summary = {
      total_reviews: allFiltered?.length || 0,
      positive_count: allFiltered?.filter((r) => r.sentiment === "positive").length || 0,
      negative_count: allFiltered?.filter((r) => r.sentiment === "negative").length || 0,
      neutral_count: allFiltered?.filter((r) => r.sentiment === "neutral").length || 0,
      average_rating: 0,
    };

    if (allFiltered && allFiltered.length > 0) {
      summary.average_rating =
        Math.round(
          (allFiltered.reduce((sum, r) => sum + (r.rating || 0), 0) /
            allFiltered.length) *
            10
        ) / 10;
    }

    // Fetch Google Maps config for the store
    const { data: mapsConfig } = await supabase
      .from("store_google_maps")
      .select("*")
      .eq("store_id", store_id)
      .single();

    return Response.json({
      reviews: reviews || [],
      summary,
      maps_config: mapsConfig || null,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Summary error:", error);
    return Response.json(
      {
        error:
          "Terjadi kesalahan: " +
          (error instanceof Error ? error.message : "Unknown error"),
      },
      { status: 500 }
    );
  }
}
