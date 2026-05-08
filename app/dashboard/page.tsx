"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase, Transaction, CATEGORIES, autoCategory } from "@/lib/supabase";
import {
  AreaChart, Area, XAxis, YAxis,
  ResponsiveContainer, Tooltip,
} from "recharts";
import BottomNav from "@/components/BottomNav";
import { format, startOfMonth, endOfMonth } from "date-fns";
import type { AIContext } from "@/lib/financial-analysis";

const scoreColor = (s: number) =>
  s >= 85 ? "#1D9E75" : s >= 70 ? "#378ADD" : s >= 55 ? "#EF9F27" : "#E24B4A";

const gradeColor: Record<string, string> = {
  A: "#1D9E75", B: "#378ADD", C: "#EF9F27", D: "#E24B4A", F: "#E24B4A",
};

function InsightChip({ emoji, text, type = "info" }: { emoji: string; text: string; type?: "info"|"warn"|"danger"|"good" }) {
  const colors = {
    info:   { bg: "var(--blue-light)",   color: "#185FA5" },
    warn:   { bg: "var(--amber-light)",  color: "#854F0B" },
    danger: { bg: "var(--red-light)",    color: "var(--red)" },
    good:   { bg: "var(--green-light)",  color: "var(--green-dark)" },
  };
  const c = colors[type];
  return (
    <div style={{ background: c.bg, color: c.color, borderRadius: 10, padding: "10px 13px",
      fontSize: 13, lineHeight: 1.5, margin: "0 16px 8px" }}>
      {emoji} {text}
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser]       = useState<any>(null);
  const [ctx, setCtx]         = useState<AIContext | null>(null);
  const [txns, setTxns]       = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (uid: string) => {
    const now   = new Date();
    const start = format(startOfMonth(now), "yyyy-MM-dd");
    const end   = format(endOfMonth(now),   "yyyy-MM-dd");
    const [aRes, txnRes] = await Promise.all([
      fetch(`/api/ai?userId=${uid}`),
      supabase.from("transactions").select("*").eq("user_id", uid)
        .gte("date", start).lte("date", end).order("date", { ascending: false }),
    ]);
    if (aRes.ok) { const j = await aRes.json(); setCtx(j.ctx); }
    setTxns(txnRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/login"); return; }
      setUser(session.user);
      loadData(session.user.id);
    });
  }, []);

  if (loading) return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",flexDirection:"column",gap:12 }}>
      <div style={{ width:40,height:40,borderRadius:"50%",border:"3px solid var(--green)",borderTopColor:"transparent",animation:"spin .8s linear infinite" }} />
      <p style={{ color:"var(--text-muted)",fontSize:13 }}>Loading your finances…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const recentTxns = txns.slice(0, 5);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "सुप्रभात" : hour < 17 ? "नमस्कार" : "शुभसंध्या";

  return (
    <div className="page">
      {/* Hero */}
      <div style={{ background:"linear-gradient(135deg,#1D9E75,#0F6E56)",padding:"52px 20px 22px" }}>
        <p style={{ fontSize:13,color:"rgba(255,255,255,.8)" }}>{greeting}, {ctx?.name ?? "User"} 👋</p>
        <p style={{ fontSize:11,color:"rgba(255,255,255,.6)",marginBottom:14 }}>
          {ctx?.currentMonth} · {ctx?.daysIntoMonth}/{ctx?.daysInMonth} days
        </p>
        <div style={{ marginBottom:16 }}>
          <p style={{ fontSize:12,color:"rgba(255,255,255,.75)" }}>Net Savings</p>
          <p style={{ fontSize:36,fontWeight:700,color:"#fff",margin:"4px 0" }}>
            ₹{(ctx?.savings ?? 0).toLocaleString("en-IN")}
          </p>
          <p style={{ fontSize:12,color:"rgba(255,255,255,.7)" }}>
            Savings rate: {ctx?.savingsRate.toFixed(1) ?? 0}%
          </p>
        </div>
        {ctx && (
          <div style={{ display:"flex",alignItems:"center",gap:10,background:"rgba(255,255,255,.15)",borderRadius:12,padding:"10px 14px" }}>
            <div style={{ width:42,height:42,borderRadius:"50%",background:gradeColor[ctx.healthScore.grade],
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,color:"#fff",flexShrink:0 }}>
              {ctx.healthScore.grade}
            </div>
            <div>
              <p style={{ fontSize:13,fontWeight:600,color:"#fff" }}>Health: {ctx.healthScore.score}/100</p>
              <p style={{ fontSize:11,color:"rgba(255,255,255,.75)" }}>{ctx.healthScore.label}</p>
            </div>
            <div style={{ marginLeft:"auto" }}>
              <div style={{ width:50,height:6,background:"rgba(255,255,255,.2)",borderRadius:20 }}>
                <div style={{ width:`${ctx.healthScore.score}%`,height:"100%",background:"#fff",borderRadius:20 }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="metric-row" style={{ marginTop:16 }}>
        <div className="metric-card">
          <div className="metric-label">Income</div>
          <div className="metric-value" style={{ color:"var(--green-dark)" }}>₹{(ctx?.income??0).toLocaleString("en-IN")}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Expenses</div>
          <div className="metric-value" style={{ color:"var(--red)" }}>₹{(ctx?.expenses??0).toLocaleString("en-IN")}</div>
          {ctx && ctx.overspentCategories.length > 0 && (
            <div className="metric-change" style={{ color:"var(--red)" }}>⚠️ {ctx.overspentCategories.length} over budget</div>
          )}
        </div>
      </div>

      {/* Annual Goal */}
      {ctx && ctx.annualGoal > 0 && (
        <div className="card">
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
            <div>
              <p style={{ fontSize:13,fontWeight:600 }}>🎯 Annual Goal</p>
              <p style={{ fontSize:11,color:"var(--text-muted)",marginTop:2 }}>
                ₹{ctx.predictedYearEnd.toLocaleString("en-IN")} predicted / ₹{ctx.annualGoal.toLocaleString("en-IN")}
              </p>
            </div>
            <div style={{ fontSize:20,fontWeight:700,color:ctx.goalOnTrack?"var(--green)":"var(--amber)" }}>
              {ctx.goalProgress}%
            </div>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{
              width:`${Math.min(ctx.goalProgress,100)}%`,
              background: ctx.goalOnTrack ? "var(--green)" : ctx.goalProgress>60 ? "var(--amber)" : "var(--red)"
            }} />
          </div>
          <p style={{ fontSize:11,color:"var(--text-muted)",marginTop:6 }}>
            {ctx.goalOnTrack ? `✅ On track!` : `⚠️ ₹${Math.ceil(ctx.annualGoal/12).toLocaleString("en-IN")}/month हवे`}
          </p>
        </div>
      )}

      {/* Trend Chart */}
      {ctx && ctx.trends.some(t => t.expenses > 0) && (
        <div className="card">
          <p style={{ fontSize:12,fontWeight:600,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:12 }}>Monthly Trend</p>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={ctx.trends} margin={{ top:4,right:0,left:-24,bottom:0 }}>
              <defs>
                <linearGradient id="incG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#1D9E75" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#1D9E75" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="expG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#E24B4A" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#E24B4A" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize:10 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:10 }} axisLine={false} tickLine={false}
                tickFormatter={v=>`₹${v>=1000?(v/1000).toFixed(0)+"k":v}`}/>
              <Tooltip formatter={(v:any,n:string)=>[`₹${Number(v).toLocaleString("en-IN")}`,n==="income"?"Income":"Expenses"]}/>
              <Area type="monotone" dataKey="income"   stroke="#1D9E75" strokeWidth={2} fill="url(#incG)"/>
              <Area type="monotone" dataKey="expenses" stroke="#E24B4A" strokeWidth={2} fill="url(#expG)"/>
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display:"flex",gap:14,justifyContent:"center",fontSize:11,color:"var(--text-muted)",marginTop:8 }}>
            {[["#1D9E75","Income"],["#E24B4A","Expenses"]].map(([c,l])=>(
              <span key={l} style={{ display:"flex",alignItems:"center",gap:4 }}>
                <span style={{ width:8,height:8,borderRadius:2,background:c,display:"inline-block" }}/>{l}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Category bars */}
      {ctx && ctx.categoryBreakdown.length > 0 && (
        <div className="card">
          <p style={{ fontSize:12,fontWeight:600,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:12 }}>Spending Breakdown</p>
          {ctx.categoryBreakdown.slice(0,5).map(cat=>(
            <div key={cat.category} style={{ marginBottom:10 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}>
                <span style={{ fontSize:13 }}>
                  {cat.emoji} {cat.label}
                  {cat.overBudget&&<span style={{ marginLeft:6,fontSize:10,background:"var(--red-light)",color:"var(--red)",padding:"1px 5px",borderRadius:8,fontWeight:600 }}>Over!</span>}
                </span>
                <span style={{ fontSize:12,color:"var(--text-secondary)" }}>
                  ₹{cat.amount.toLocaleString("en-IN")}{cat.budget?` / ₹${cat.budget.toLocaleString("en-IN")}`:""} ({cat.pct}%)
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{
                  width: cat.budget ? `${Math.min((cat.amount/cat.budget)*100,100)}%` : `${cat.pct}%`,
                  background: cat.overBudget ? "var(--red)" : CATEGORIES[cat.category as keyof typeof CATEGORIES]?.color||"var(--green)"
                }}/>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Health breakdown */}
      {ctx && (
        <div className="card">
          <p style={{ fontSize:12,fontWeight:600,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:12 }}>Health Score Breakdown</p>
          {ctx.healthScore.breakdown.map(b=>(
            <div key={b.label} style={{ marginBottom:10 }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
                <span style={{ fontSize:12,color:"var(--text-secondary)" }}>{b.label}</span>
                <span style={{ fontSize:12,fontWeight:600,color:scoreColor(b.score/b.max*100) }}>{b.score}/{b.max}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width:`${(b.score/b.max)*100}%`,background:scoreColor(b.score/b.max*100) }}/>
              </div>
              <p style={{ fontSize:11,color:"var(--text-muted)",marginTop:3 }}>{b.tip}</p>
            </div>
          ))}
        </div>
      )}

      {/* AI Insights */}
      {ctx && (
        <>
          <p className="section-title" style={{ marginTop:4 }}>AI Insights</p>
          {ctx.billsDueSoon.length>0&&(
            <InsightChip type="danger" emoji="🔔"
              text={`${ctx.billsDueSoon.length} bill due soon — ₹${ctx.billsDueSoon.reduce((s,b)=>s+b.amount,0).toLocaleString("en-IN")} total`}/>
          )}
          {ctx.overspentCategories.length>0&&(
            <InsightChip type="warn" emoji="⚠️"
              text={`${ctx.overspentCategories.map(c=>c.label).join(", ")} budget ओलांडला`}/>
          )}
          {ctx.savingsRate>=30&&(
            <InsightChip type="good" emoji="🌟" text={`${ctx.savingsRate.toFixed(1)}% savings rate — excellent! AI Advisor ला invest tips विचारा`}/>
          )}
          {ctx.savingsRate>0&&ctx.savingsRate<15&&(
            <InsightChip type="warn" emoji="📉" text={`Savings rate ${ctx.savingsRate.toFixed(1)}% — 20% target आहे`}/>
          )}
          {!ctx.goalOnTrack&&ctx.annualGoal>0&&(
            <InsightChip type="danger" emoji="🎯" text={`Annual goal track वर नाही. ₹${Math.ceil(ctx.annualGoal/12).toLocaleString("en-IN")}/month save करणे आवश्यक`}/>
          )}
        </>
      )}

      {/* Recent txns */}
      {recentTxns.length>0 ? (
        <>
          <p className="section-title" style={{ marginTop:8 }}>Recent Transactions</p>
          <div className="card" style={{ padding:0,overflow:"hidden" }}>
            {recentTxns.map(txn=>{
              const cat=CATEGORIES[txn.category as keyof typeof CATEGORIES];
              return (
                <div key={txn.id} className="txn-item">
                  <div className="txn-icon" style={{ background:(cat?.color||"#888")+"22",fontSize:18 }}>{cat?.emoji||"📦"}</div>
                  <div className="txn-info">
                    <div className="txn-title">{txn.title}</div>
                    <div className="txn-cat">{cat?.label||txn.category}</div>
                  </div>
                  <div>
                    <div className="txn-amount" style={{ color:txn.type==="income"?"var(--green)":"var(--red)" }}>
                      {txn.type==="income"?"+":"-"}₹{txn.amount.toLocaleString("en-IN")}
                    </div>
                    <div className="txn-date">{format(new Date(txn.date),"dd MMM")}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{ textAlign:"center",padding:"40px 20px",color:"var(--text-muted)" }}>
          <div style={{ fontSize:40,marginBottom:12 }}>📊</div>
          <p style={{ fontSize:15,fontWeight:500 }}>No transactions yet</p>
          <p style={{ fontSize:13,marginTop:4 }}>Tap + to add your first transaction</p>
        </div>
      )}

      <div style={{ height:16 }}/>
      <BottomNav/>
      {user&&<AddFAB userId={user.id} onAdded={()=>loadData(user.id)}/>}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function AddFAB({ userId, onAdded }: { userId:string; onAdded:()=>void }) {
  const [open,setOpen]       = useState(false);
  const [title,setTitle]     = useState("");
  const [amount,setAmount]   = useState("");
  const [type,setType]       = useState<"expense"|"income">("expense");
  const [category,setCategory] = useState("food");
  const [date,setDate]       = useState(format(new Date(),"yyyy-MM-dd"));
  const [note,setNote]       = useState("");
  const [saving,setSaving]   = useState(false);

  async function save() {
    if(!title.trim()||!amount) return;
    setSaving(true);
    await supabase.from("transactions").insert({
      user_id:userId, title:title.trim(),
      amount:parseFloat(amount), type, category, date,
      note:note.trim()||null,
    });
    setSaving(false); setOpen(false);
    setTitle(""); setAmount(""); setNote(""); setType("expense"); setCategory("food");
    onAdded();
  }

  return (
    <>
      <button className="fab" onClick={()=>setOpen(true)} aria-label="Add transaction">+</button>
      {open&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setOpen(false)}>
          <div className="modal-sheet">
            <div className="modal-handle"/>
            <p className="modal-title">Add Transaction</p>
            <div className="type-toggle">
              <button className={`type-btn ${type==="expense"?"active-expense":""}`} onClick={()=>setType("expense")}>💸 Expense</button>
              <button className={`type-btn ${type==="income"?"active-income":""}`} onClick={()=>setType("income")}>💰 Income</button>
            </div>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-input" placeholder="e.g. Swiggy dinner" value={title}
                onChange={e=>{setTitle(e.target.value);if(type==="expense")setCategory(autoCategory(e.target.value));}}/>
            </div>
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input className="form-input" type="number" inputMode="decimal" placeholder="0" value={amount} onChange={e=>setAmount(e.target.value)}/>
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={category} onChange={e=>setCategory(e.target.value)}>
                {Object.entries(CATEGORIES).map(([k,v])=><option key={k} value={k}>{v.emoji} {v.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
            </div>
            <div className="form-group" style={{ marginBottom:20 }}>
              <label className="form-label">Note (optional)</label>
              <input className="form-input" placeholder="e.g. Team lunch" value={note} onChange={e=>setNote(e.target.value)}/>
            </div>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving?"Saving…":"Save Transaction"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
