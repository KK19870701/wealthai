"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, Transaction, CATEGORIES } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import { format, startOfMonth, endOfMonth } from "date-fns";

const QUICK_QUESTIONS = [
  "कुठे जास्त खर्च होतोय?",
  "3 saving tips सांग",
  "Investment साठी काय करू?",
  "Annual goal track on है?",
];

type Msg = { role: "user" | "ai"; text: string };

export default function AIAdvisor() {
  const router = useRouter();
  const [msgs, setMsgs] = useState<Msg[]>([{
    role: "ai",
    text: "Namaste! 🙏 मी तुमचा AI financial advisor आहे. तुमच्या spending, savings, किंवा investment बद्दल काहीही विचारा — मराठी किंवा English मध्ये!"
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState("");
  const [userId, setUserId] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/login"); return; }
      const uid = session.user.id;
      setUserId(uid);

      const now = new Date();
      const start = format(startOfMonth(now), "yyyy-MM-dd");
      const end = format(endOfMonth(now), "yyyy-MM-dd");

      const [profileRes, txnRes, budgetRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).single(),
        supabase.from("transactions").select("*").eq("user_id", uid).gte("date", start).lte("date", end),
        supabase.from("budgets").select("*").eq("user_id", uid).eq("month", now.getMonth() + 1).eq("year", now.getFullYear())
      ]);

      const txns: Transaction[] = txnRes.data || [];
      const income = txns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const expenses = txns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

      const catBreakdown = Object.entries(CATEGORIES).map(([key, cat]) => {
        const spent = txns.filter(t => t.type === "expense" && t.category === key).reduce((s, t) => s + t.amount, 0);
        const budget = budgetRes.data?.find((b: any) => b.category === key);
        return spent > 0 ? `${cat.label}: ₹${spent.toLocaleString("en-IN")}${budget ? ` (budget ₹${budget.limit_amount.toLocaleString("en-IN")})` : ""}` : null;
      }).filter(Boolean).join(", ");

      setContext(`
User Financial Data (${format(now, "MMMM yyyy")}):
- Name: ${profileRes.data?.full_name || "User"}
- Monthly Income: ₹${income.toLocaleString("en-IN")}
- Total Expenses: ₹${expenses.toLocaleString("en-IN")}  
- Net Savings: ₹${(income - expenses).toLocaleString("en-IN")}
- Savings Rate: ${income > 0 ? ((income - expenses) / income * 100).toFixed(1) : 0}%
- Annual Savings Goal: ₹${(profileRes.data?.savings_goal || 0).toLocaleString("en-IN")}
- Spending breakdown: ${catBreakdown || "No expenses yet"}
- Location: India (Pune likely)
- Currency: INR
      `.trim());
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const q = text.trim();
    setInput("");
    setMsgs(prev => [...prev, { role: "user", text: q }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, context })
      });
      const data = await res.json();
      setMsgs(prev => [...prev, { role: "ai", text: data.answer || "Sorry, I couldn't process that." }]);
    } catch {
      setMsgs(prev => [...prev, { role: "ai", text: "Connection error. Please try again." }]);
    }
    setLoading(false);
  }

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{ background: "var(--card)", padding: "52px 20px 14px", borderBottom: "1px solid var(--border)" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>AI Advisor 🤖</h1>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Powered by Claude — ask in Marathi or English</p>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "10px 16px", overflowX: "auto", background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
        {QUICK_QUESTIONS.map(q => (
          <button key={q} onClick={() => sendMessage(q)}
            style={{ whiteSpace: "nowrap", padding: "6px 12px", borderRadius: 20, border: "1px solid var(--border)", background: "var(--bg)", fontSize: 12, color: "var(--text-secondary)", cursor: "pointer", flexShrink: 0 }}>
            {q}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column" }}>
        {msgs.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.role === "ai" ? "chat-ai" : "chat-user"}`}
            style={{ display: "block", marginLeft: msg.role === "user" ? "auto" : undefined }}>
            {msg.text}
          </div>
        ))}
        {loading && (
          <div className="chat-msg chat-ai" style={{ display: "block" }}>
            <span style={{ animation: "pulse 1s infinite" }}>Thinking...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: "10px 16px", paddingBottom: "calc(10px + var(--bottom-nav-height) + env(safe-area-inset-bottom))", background: "var(--card)", borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage(input)}
          placeholder="Ask about your finances..."
          style={{ flex: 1, padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 22, fontSize: 14, outline: "none", background: "var(--bg)" }}
        />
        <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
          style={{ width: 42, height: 42, borderRadius: "50%", background: loading ? "var(--bg)" : "var(--green)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="18" height="18" fill="white" viewBox="0 0 24 24">
            <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
          </svg>
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
