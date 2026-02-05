import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SearchParams {
  city?: string;
  category?: string;
  query?: string;
}

async function getAmadeusToken(): Promise<string> {
  const clientId = Deno.env.get("AMADEUS_API_KEY");
  const clientSecret = Deno.env.get("AMADEUS_SECRET_KEY");

  if (!clientId || !clientSecret) {
    throw new Error("Missing Amadeus credentials");
  }

  const response = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`,
  });

  if (!response.ok) {
    throw new Error(`Failed to get Amadeus token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function searchHotels(
  city: string,
  token: string
): Promise<Record<string, unknown>[]> {
  const response = await fetch(
    `https://test.api.amadeus.com/v1/reference-data/locations/get?keyword=${encodeURIComponent(city)}&subType=CITY`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to search hotels: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || [];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const params: SearchParams = {
      city: url.searchParams.get("city") || undefined,
      category: url.searchParams.get("category") || undefined,
      query: url.searchParams.get("query") || undefined,
    };

    if (!params.city && !params.query) {
      return new Response(
        JSON.stringify({ error: "Missing city or query parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = await getAmadeusToken();
    const searchQuery = params.city || params.query || "";
    const results = await searchHotels(searchQuery, token);

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
