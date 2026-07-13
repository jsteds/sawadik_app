import { type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

interface NlpSentiment {
  sentiment: "positive" | "negative" | "neutral";
  score: number;
}

// Analyze sentiment using Google Cloud Natural Language API
async function analyzeSentimentWithNLP(
  text: string,
  apiKey: string
): Promise<NlpSentiment> {
  const url = `https://language.googleapis.com/v1/documents:analyzeSentiment?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      document: {
        type: "PLAIN_TEXT",
        content: text,
        language: "id", // Indonesian
      },
      encodingType: "UTF8",
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `Google NLP API error: ${errorData.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  const score = data.documentSentiment?.score ?? 0;
  const magnitude = data.documentSentiment?.magnitude ?? 0;

  // Determine sentiment category based on score and magnitude
  let sentiment: "positive" | "negative" | "neutral";
  if (score > 0.2 && magnitude > 0.1) {
    sentiment = "positive";
  } else if (score < -0.2 && magnitude > 0.1) {
    sentiment = "negative";
  } else {
    sentiment = "neutral";
  }

  return { sentiment, score };
}

// Fallback: Simple rule-based sentiment analysis using rating + keywords
function analyzeSentimentFallback(
  text: string | null,
  rating: number
): NlpSentiment {
  // Primary: Use rating as main indicator
  if (rating >= 4) {
    return { sentiment: "positive", score: rating === 5 ? 0.9 : 0.6 };
  }
  if (rating <= 2) {
    return { sentiment: "negative", score: rating === 1 ? -0.9 : -0.6 };
  }

  // For rating 3, analyze text if available
  if (text) {
    const lowerText = text.toLowerCase();
    const negativeWords = [
      "buruk", "jelek", "lambat", "kotor", "kecewa", "mahal", "tidak enak",
      "bad", "worst", "terrible", "horrible", "poor", "dirty", "slow",
      "rude", "kasar", "kurang", "tidak ramah", "mengecewakan", "payah",
    ];
    const positiveWords = [
      "bagus", "enak", "murah", "ramah", "cepat", "bersih", "suka",
      "good", "great", "excellent", "amazing", "love", "best", "nice",
      "mantap", "recommended", "rekomendasi", "puas", "lezat", "nyaman",
    ];

    const negCount = negativeWords.filter((w) => lowerText.includes(w)).length;
    const posCount = positiveWords.filter((w) => lowerText.includes(w)).length;

    if (posCount > negCount) return { sentiment: "positive", score: 0.4 };
    if (negCount > posCount) return { sentiment: "negative", score: -0.4 };
  }

  return { sentiment: "neutral", score: 0 };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { store_id } = body;

    if (!store_id) {
      return Response.json(
        { error: "store_id diperlukan" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const nlpApiKey = process.env.GOOGLE_CLOUD_NLP_API_KEY;

    // Fetch reviews that haven't been analyzed yet
    const { data: reviews, error: fetchError } = await supabase
      .from("google_maps_reviews")
      .select("*")
      .eq("store_id", store_id)
      .is("sentiment", null)
      .order("scraped_at", { ascending: false });

    if (fetchError) {
      return Response.json(
        { error: "Gagal mengambil ulasan: " + fetchError.message },
        { status: 500 }
      );
    }

    if (!reviews || reviews.length === 0) {
      return Response.json({
        message: "Tidak ada ulasan yang perlu dianalisis",
        analyzed: 0,
      });
    }

    let analyzedCount = 0;
    let useNlp = !!nlpApiKey;
    const batchSize = 10; // Process in batches to avoid rate limits

    for (let i = 0; i < reviews.length; i += batchSize) {
      const batch = reviews.slice(i, i + batchSize);

      const updates = await Promise.all(
        batch.map(async (review) => {
          let result: NlpSentiment;

          if (useNlp && review.review_text) {
            try {
              result = await analyzeSentimentWithNLP(
                review.review_text,
                nlpApiKey!
              );
            } catch (nlpError) {
              console.warn(
                "NLP API error, falling back to rule-based:",
                nlpError
              );
              useNlp = false; // Disable NLP for remaining reviews if it fails
              result = analyzeSentimentFallback(
                review.review_text,
                review.rating
              );
            }
          } else {
            result = analyzeSentimentFallback(
              review.review_text,
              review.rating
            );
          }

          return {
            id: review.id,
            sentiment: result.sentiment,
            sentiment_score: result.score,
          };
        })
      );

      // Update reviews in batch
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from("google_maps_reviews")
          .update({
            sentiment: update.sentiment,
            sentiment_score: update.sentiment_score,
          })
          .eq("id", update.id);

        if (!updateError) analyzedCount++;
      }
    }

    // Generate/update sentiment summary for the store
    const { data: allReviews } = await supabase
      .from("google_maps_reviews")
      .select("rating, sentiment, review_date")
      .eq("store_id", store_id)
      .not("sentiment", "is", null);

    if (allReviews && allReviews.length > 0) {
      // Find date range
      const dates = allReviews
        .filter((r) => r.review_date)
        .map((r) => new Date(r.review_date!));

      if (dates.length > 0) {
        const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

        const positiveCount = allReviews.filter(
          (r) => r.sentiment === "positive"
        ).length;
        const negativeCount = allReviews.filter(
          (r) => r.sentiment === "negative"
        ).length;
        const neutralCount = allReviews.filter(
          (r) => r.sentiment === "neutral"
        ).length;
        const avgRating =
          allReviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
          allReviews.length;

        await supabase.from("review_sentiment_summary").upsert(
          {
            store_id,
            period_start: minDate.toISOString().split("T")[0],
            period_end: maxDate.toISOString().split("T")[0],
            total_reviews: allReviews.length,
            positive_count: positiveCount,
            negative_count: negativeCount,
            neutral_count: neutralCount,
            average_rating: Math.round(avgRating * 10) / 10,
          },
          { onConflict: "id" }
        );
      }
    }

    return Response.json({
      message: `Berhasil menganalisis ${analyzedCount} ulasan`,
      analyzed: analyzedCount,
      method: useNlp ? "Google Cloud NLP" : "Rule-based (fallback)",
    });
  } catch (error) {
    console.error("Analyze error:", error);
    return Response.json(
      {
        error:
          "Terjadi kesalahan saat analisis: " +
          (error instanceof Error ? error.message : "Unknown error"),
      },
      { status: 500 }
    );
  }
}
