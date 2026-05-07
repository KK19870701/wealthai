import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { question, context } = await req.json();

  if (!question) return NextResponse.json({ error: "No question" }, { status: 400 });

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        system: `You are a smart, friendly personal finance AI advisor for an Indian user. 
You have access to their current month's financial data. 
Give concise, specific, actionable advice in 2-4 sentences max.
Use ₹ symbol for Indian Rupees. 
If user writes in Marathi, respond in Marathi. If in English, respond in English.
Recommend Indian financial products when relevant: SIP, PPF, FD, NPS, ELSS, Zerodha, Groww.
Never give risky investment advice. Always add a disclaimer for significant investment suggestions.

User Financial Context:
${context || "No financial data available yet. Encourage user to add transactions."}`,
        messages: [{ role: "user", content: question }],
      }),
    });

    const data = await res.json();
    const answer = data.content?.[0]?.text || "Sorry, I could not process your question.";
    return NextResponse.json({ answer });
  } catch (error) {
    return NextResponse.json({ error: "AI service error" }, { status: 500 });
  }
}
