import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { analyzeFinances, buildSystemPrompt } from "@/lib/financial-analysis";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

const FALLBACKS: Record<string, string> = {
  marathi: "माफ करा, AI advisor सध्या उपलब्ध नाही. थोड्या वेळाने पुन्हा प्रयत्न करा. तुमचा dashboard check करा — तिथे तुमचे सगळे analytics दिसतात! 📊",
  english: "Sorry, the AI advisor is temporarily unavailable. Please try again in a moment. Meanwhile, check your dashboard for spending insights and budget status! 📊",
};

function detectLanguage(text: string): "marathi" | "english" {
  return /[\u0900-\u097F]/.test(text) ? "marathi" : "english";
}

async function fetchUserData(userId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const now = new Date();
  const curStart = format(startOfMonth(now), "yyyy-MM-dd");
  const curEnd   = format(endOfMonth(now), "yyyy-MM-dd");
  const hisStart = format(startOfMonth(subMonths(now, 4)), "yyyy-MM-dd");

  const [profileRes, curTxnRes, hisTxnRes, budgetRes, billRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("transactions").select("*").eq("user_id", userId).gte("date", curStart).lte("date", curEnd),
    supabase.from("transactions").select("*").eq("user_id", userId).gte("date", hisStart).lte("date", curEnd),
    supabase.from("budgets").select("*").eq("user_id", userId).eq("month", now.getMonth() + 1).eq("year", now.getFullYear()),
    supabase.from("bills").select("*").eq("user_id", userId).eq("is_active", true),
  ]);

  return analyzeFinances(
    profileRes.data,
    curTxnRes.data || [],
    budgetRes.data || [],
    billRes.data || [],
    hisTxnRes.data || []
  );
}

export async function POST(req: NextRequest) {
  try {
    const { question, userId } = await req.json();
    if (!question || !userId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const ctx = await fetchUserData(userId);
    const systemPrompt = buildSystemPrompt(ctx);

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: "user", content: question }],
      }),
    });

    if (!aiRes.ok) {
      return NextResponse.json({ answer: FALLBACKS[detectLanguage(question)], fallback: true, ctx });
    }

    const data = await aiRes.json();
    const answer = data.content?.[0]?.text || FALLBACKS[detectLanguage(question)];
    return NextResponse.json({ answer, ctx });
  } catch (err) {
    console.error("AI advisor error:", err);
    return NextResponse.json({ answer: FALLBACKS.marathi, fallback: true });
  }
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  try {
    const ctx = await fetchUserData(userId);
    return NextResponse.json({ ctx });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
