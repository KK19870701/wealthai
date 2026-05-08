"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import type { AIContext } from "@/lib/financial-analysis";

const QUICK_QUESTIONS = [
  { label: "कुठे जास्त खर्च?",  q: "या महिन्यात कुठे सर्वात जास्त खर्च होतोय? कमी कसे करू?" },
  { label: "Savings tips",       q: "माझ्या spending pattern वर आधारित 3 specific saving tips सांग" },
  { label: "Investment",         q: "माझ्याकडे surplus आहे — SIP, FD, किंवा PPF मध्ये काय करू?" },
  { label: "Goal track?",        q: "Annual savings goal track वर आहे का? नसेल तर काय करायला हवे?" },
  { label: "Health score",       q: "माझा financial health score explain कर आणि improve कसे करू?" },
  { label: "Budget advice",      q: "Budget ओलांडलेल्या categories साठी specific advice दे" },
];

type Msg = { role: "user"|"ai"; text: string; fallback?: boolean };

// mini scorecard shown above chat
function ScoreCard({ ctx }: { ctx: AIContext }) {
  const gradeColor: Record<string,string> = { A:"#1D9E75", B:"#378ADD", C:"#EF9F27", D:"#E24B4A", F:"#E24B4A" };
  return (
    <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,padding:"12px 16px",background:"var(--bg)",borderBottom:"1px solid var(--border)" }}>
      {[
        { label:"Income",   value:`₹${ctx.income.toLocaleString("en-IN")}`,   color:"var(--green-dark)" },
        { label:"Expenses", value:`₹${ctx.expenses.toLocaleString("en-IN")}`, color:"var(--red)" },
        { label:"Savings",  value:`₹${ctx.savings.toLocaleString("en-IN")}`,  color: ctx.savings>=0?"var(--green-dark)":"var(--red)" },
      ].map(m=>(
        <div key={m.label} style={{ background:"var(--card)",borderRadius:10,padding:"10px 10px",border:"1px solid var(--border)",textAlign:"center" }}>
          <div style={{ fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".4px",marginBottom:4 }}>{m.label}</div>
          <div style={{ fontSize:14,fontWeight:700,color:m.color }}>{m.value}</div>
        </div>
      ))}
      {/* health score row */}
      <div style={{ gridColumn:"1/-1",background:"var(--card)",borderRadius:10,padding:"10px 14px",border:"1px solid var(--border)",display:"flex",alignItems:"center",gap:10 }}>
        <div style={{ width:36,height:36,borderRadius:"50%",background:gradeColor[ctx.healthScore.grade],
          display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:16,flexShrink:0 }}>
          {ctx.healthScore.grade}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:12,fontWeight:600,color:"var(--text-primary)" }}>Health Score: {ctx.healthScore.score}/100 — {ctx.healthScore.label}</div>
          <div style={{ height:5,background:"var(--bg)",borderRadius:20,marginTop:5,overflow:"hidden" }}>
            <div style={{ width:`${ctx.healthScore.score}%`,height:"100%",background:gradeColor[ctx.healthScore.grade],borderRadius:20 }}/>
          </div>
        </div>
        {ctx.annualGoal>0&&(
          <div style={{ textAlign:"right",flexShrink:0 }}>
            <div style={{ fontSize:10,color:"var(--text-muted)" }}>Goal</div>
            <div style={{ fontSize:13,fontWeight:700,color:ctx.goalOnTrack?"var(--green)":"var(--amber)" }}>{ctx.goalProgress}%</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AIAdvisor() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [ctx, setCtx]       = useState<AIContext | null>(null);
  const [msgs, setMsgs]     = useState<Msg[]>([{
    role:"ai",
    text:"Namaste! 🙏 मी तुमचा AI financial advisor आहे. तुमचा real financial data बघून specific advice देतो. वरचे quick buttons वापरा किंवा स्वतः विचारा — Marathi किंवा English मध्ये!"
  }]);
  const [input, setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [ctxLoading, setCtxLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/login"); return; }
      const uid = session.user.id;
      setUserId(uid);
      try {
        const res = await fetch(`/api/ai?userId=${uid}`);
        if (res.ok) { const j = await res.json(); setCtx(j.ctx); }
      } catch {}
      setCtxLoading(false);
    });
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading || !userId) return;
    const q = text.trim();
    setInput("");
    setMsgs(prev => [...prev, { role:"user", text:q }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ question:q, userId }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      if (data.ctx) setCtx(data.ctx); // refresh real-time data
      setMsgs(prev => [...prev, { role:"ai", text: data.answer, fallback: data.fallback }]);
    } catch {
      setMsgs(prev => [...prev, {
        role:"ai",
        text:"माफ करा, connection error. Internet check करा आणि पुन्हा प्रयत्न करा. 🔄",
        fallback:true
      }]);
    }
    setLoading(false);
  }, [loading, userId]);

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100vh",background:"var(--bg)" }}>

      {/* Header */}
      <div style={{ background:"var(--card)",padding:"52px 20px 14px",borderBottom:"1px solid var(--border)",flexShrink:0 }}>
        <h1 style={{ fontSize:20,fontWeight:700 }}>AI Advisor 🤖</h1>
        <p style={{ fontSize:12,color:"var(--text-muted)",marginTop:2 }}>
          Powered by Claude · Real data · Marathi / English
        </p>
      </div>

      {/* Live scorecard */}
      {ctxLoading ? (
        <div style={{ padding:"12px 16px",background:"var(--bg)",borderBottom:"1px solid var(--border)",fontSize:12,color:"var(--text-muted)",flexShrink:0 }}>
          Loading your financial data…
        </div>
      ) : ctx ? (
        <div style={{ flexShrink:0 }}><ScoreCard ctx={ctx}/></div>
      ) : null}

      {/* Quick question chips */}
      <div style={{ display:"flex",gap:8,padding:"10px 16px",overflowX:"auto",background:"var(--card)",borderBottom:"1px solid var(--border)",flexShrink:0 }}>
        {QUICK_QUESTIONS.map(qq=>(
          <button key={qq.label} onClick={()=>sendMessage(qq.q)} disabled={loading}
            style={{ whiteSpace:"nowrap",padding:"6px 12px",borderRadius:20,border:"1px solid var(--border)",
              background:"var(--bg)",fontSize:12,color:"var(--text-secondary)",cursor:"pointer",flexShrink:0 }}>
            {qq.label}
          </button>
        ))}
      </div>

      {/* Chat messages */}
      <div style={{ flex:1,overflowY:"auto",padding:"16px",display:"flex",flexDirection:"column",gap:2 }}>
        {msgs.map((msg,i)=>(
          <div key={i} className={`chat-msg ${msg.role==="ai"?"chat-ai":"chat-user"}`}
            style={{ display:"block",marginLeft:msg.role==="user"?"auto":undefined,
              opacity: msg.fallback ? 0.8 : 1,
              border: msg.fallback ? "1px solid var(--amber-light)" : undefined }}>
            {msg.fallback && <span style={{ fontSize:10,color:"var(--amber)",display:"block",marginBottom:4 }}>⚠️ Fallback response</span>}
            {msg.text}
          </div>
        ))}
        {loading&&(
          <div className="chat-msg chat-ai" style={{ display:"flex",gap:6,alignItems:"center" }}>
            {[0,1,2].map(i=>(
              <div key={i} style={{ width:6,height:6,borderRadius:"50%",background:"var(--green)",
                animation:`bounce .8s ${i*0.15}s infinite alternate` }}/>
            ))}
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Overspend alerts above input */}
      {ctx && ctx.overspentCategories.length>0 && (
        <div style={{ padding:"6px 16px",background:"var(--red-light)",borderTop:"1px solid var(--border)",flexShrink:0 }}>
          <p style={{ fontSize:11,color:"var(--red)" }}>
            ⚠️ Over budget: {ctx.overspentCategories.map(c=>c.label).join(", ")} — AI ला advice विचारा
          </p>
        </div>
      )}

      {/* Input bar */}
      <div style={{ padding:"10px 16px",paddingBottom:`calc(10px + var(--bottom-nav-height) + env(safe-area-inset-bottom))`,
        background:"var(--card)",borderTop:"1px solid var(--border)",display:"flex",gap:8,flexShrink:0 }}>
        <input value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&sendMessage(input)}
          placeholder="Ask about your finances…"
          style={{ flex:1,padding:"10px 14px",border:"1px solid var(--border)",borderRadius:22,fontSize:14,outline:"none",background:"var(--bg)" }}/>
        <button onClick={()=>sendMessage(input)} disabled={loading||!input.trim()}
          style={{ width:42,height:42,borderRadius:"50%",background:loading||!input.trim()?"var(--bg)":"var(--green)",
            border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
          <svg width="18" height="18" fill="white" viewBox="0 0 24 24">
            <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
          </svg>
        </button>
      </div>

      <BottomNav/>
      <style>{`
        @keyframes bounce { to { transform: translateY(-4px); } }
      `}</style>
    </div>
  );
}
