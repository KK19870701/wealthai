"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, Transaction, CATEGORIES, autoCategory, uploadReceipt } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import { format, startOfMonth, endOfMonth } from "date-fns";
import type { AIContext } from "@/lib/financial-analysis";

// ── tiny spinner ────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ width:16,height:16,borderRadius:"50%",border:"2px solid #ccc",
      borderTopColor:"var(--green)",animation:"spin .7s linear infinite",display:"inline-block" }}/>
  );
}

// ── receipt thumbnail / upload ──────────────────────────────────────────────
function ReceiptCell({ txn, userId, onUpdated }: {
  txn: Transaction; userId: string; onUpdated: (id:string, url:string|null) => void
}) {
  const inputRef   = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // 5 MB guard
    if (file.size > 5 * 1024 * 1024) {
      alert("File too large. Maximum 5 MB."); return;
    }
    setBusy(true);
    const url = await uploadReceipt(userId, txn.id, file);
    if (url) {
      await supabase.from("transactions").update({ receipt_url: url }).eq("id", txn.id);
      onUpdated(txn.id, url);
    } else {
      alert("Upload failed. Check Supabase Storage bucket setup.");
    }
    setBusy(false);
  }

  async function remove() {
    if (!confirm("Delete this receipt?")) return;
    setBusy(true);
    await supabase.storage.from("receipts").remove([
      `${userId}/${txn.id}.jpg`,
      `${userId}/${txn.id}.jpeg`,
      `${userId}/${txn.id}.png`,
      `${userId}/${txn.id}.webp`,
    ]);
    await supabase.from("transactions").update({ receipt_url: null }).eq("id", txn.id);
    onUpdated(txn.id, null);
    setBusy(false);
  }

  if (busy) return <Spinner/>;

  if (txn.receipt_url) return (
    <div style={{ display:"flex",alignItems:"center",gap:6 }}>
      <a href={txn.receipt_url} target="_blank" rel="noopener noreferrer">
        <img src={txn.receipt_url} alt="receipt"
          style={{ width:36,height:36,objectFit:"cover",borderRadius:6,border:"1px solid var(--border)" }}/>
      </a>
      <button onClick={remove}
        style={{ background:"none",border:"none",cursor:"pointer",color:"var(--red)",fontSize:16,padding:2 }}>×</button>
    </div>
  );

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*,application/pdf"
        style={{ display:"none" }} onChange={handleFile}/>
      <button onClick={()=>inputRef.current?.click()}
        style={{ background:"none",border:"1px dashed var(--border)",borderRadius:6,
          padding:"4px 8px",fontSize:11,color:"var(--text-muted)",cursor:"pointer",
          display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap" }}>
        📎 Upload
      </button>
    </>
  );
}

// ── main page ───────────────────────────────────────────────────────────────
export default function ExpensesPage() {
  const router = useRouter();
  const [txns, setTxns]     = useState<Transaction[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading]   = useState(true);
  const [pdfBusy, setPdfBusy]   = useState(false);
  const [userId, setUserId]     = useState("");
  const [ctx, setCtx]           = useState<AIContext | null>(null);
  const [addOpen, setAddOpen]   = useState(false);
  const [viewTxn, setViewTxn]   = useState<Transaction | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/login"); return; }
      const uid = session.user.id;
      setUserId(uid);
      loadAll(uid);
    });
  }, []);

  async function loadAll(uid: string) {
    const now   = new Date();
    const start = format(startOfMonth(now), "yyyy-MM-dd");
    const end   = format(endOfMonth(now),   "yyyy-MM-dd");
    const [txnRes, ctxRes] = await Promise.all([
      supabase.from("transactions").select("*")
        .eq("user_id", uid).gte("date", start).lte("date", end)
        .order("date", { ascending: false }),
      fetch(`/api/ai?userId=${uid}`),
    ]);
    setTxns(txnRes.data || []);
    if (ctxRes.ok) { const j = await ctxRes.json(); setCtx(j.ctx); }
    setLoading(false);
  }

  function handleReceiptUpdate(id: string, url: string | null) {
    setTxns(prev => prev.map(t => t.id === id ? { ...t, receipt_url: url ?? undefined } : t));
  }

  async function deleteTxn(id: string) {
    if (!confirm("Delete this transaction?")) return;
    await supabase.from("transactions").delete().eq("id", id);
    setTxns(prev => prev.filter(t => t.id !== id));
    setViewTxn(null);
  }

  async function downloadPDF() {
    if (!ctx) return;
    setPdfBusy(true);
    try {
      const { generateExpenseReport } = await import("@/lib/pdf-report");
      await generateExpenseReport(txns, ctx, ctx.currentMonth);
    } catch (e) {
      alert("PDF generation failed. Try again.");
      console.error(e);
    }
    setPdfBusy(false);
  }

  const filtered = txns.filter(t => {
    if (filter !== "all" && t.category !== filter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalExpense = filtered.filter(t => t.type==="expense").reduce((s,t)=>s+t.amount,0);
  const totalIncome  = filtered.filter(t => t.type==="income").reduce((s,t)=>s+t.amount,0);
  const withReceipts = txns.filter(t => t.receipt_url).length;

  if (loading) return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100vh" }}>
      <p style={{ color:"var(--text-muted)" }}>Loading…</p>
    </div>
  );

  return (
    <div className="page">

      {/* Header */}
      <div style={{ background:"var(--card)",padding:"52px 20px 14px",borderBottom:"1px solid var(--border)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
          <div>
            <h1 style={{ fontSize:20,fontWeight:700 }}>Expenses</h1>
            <p style={{ fontSize:12,color:"var(--text-muted)",marginTop:2 }}>
              {format(new Date(),"MMMM yyyy")} · {txns.length} transactions · {withReceipts} receipts
            </p>
          </div>
          {/* PDF Download button */}
          <button onClick={downloadPDF} disabled={pdfBusy||txns.length===0}
            style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 14px",
              borderRadius:20,border:"1px solid var(--green)",background: pdfBusy?"var(--bg)":"var(--green-light)",
              color:"var(--green-dark)",fontSize:12,fontWeight:600,cursor:"pointer",flexShrink:0 }}>
            {pdfBusy ? <Spinner/> : "📄"} {pdfBusy ? "Generating…" : "PDF Report"}
          </button>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="metric-row" style={{ marginTop:12 }}>
        <div className="metric-card">
          <div className="metric-label">Expenses</div>
          <div className="metric-value" style={{ color:"var(--red)" }}>₹{totalExpense.toLocaleString("en-IN")}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Income</div>
          <div className="metric-value" style={{ color:"var(--green-dark)" }}>₹{totalIncome.toLocaleString("en-IN")}</div>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding:"0 16px 10px" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Search transactions…"
          style={{ width:"100%",padding:"10px 14px",borderRadius:22,border:"1px solid var(--border)",
            fontSize:13,outline:"none",background:"var(--card)" }}/>
      </div>

      {/* Category filter chips */}
      <div style={{ display:"flex",gap:6,padding:"0 16px 12px",overflowX:"auto" }}>
        {[["all","All"],...Object.entries(CATEGORIES).map(([k,v])=>[k,v.emoji+" "+v.label.split(" ")[0]])].map(([key,label])=>(
          <button key={key} onClick={()=>setFilter(key)}
            style={{ whiteSpace:"nowrap",padding:"6px 12px",borderRadius:20,flexShrink:0,cursor:"pointer",
              border:`1px solid ${filter===key?"var(--green)":"var(--border)"}`,fontSize:12,
              background:filter===key?"var(--green-light)":"var(--card)",
              color:filter===key?"var(--green-dark)":"var(--text-secondary)",
              fontWeight:filter===key?600:400 }}>
            {label}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      {filtered.length===0 ? (
        <div style={{ textAlign:"center",padding:"40px 20px",color:"var(--text-muted)" }}>
          <div style={{ fontSize:40,marginBottom:12 }}>🧾</div>
          <p style={{ fontSize:15,fontWeight:500 }}>No transactions found</p>
          <p style={{ fontSize:13,marginTop:4 }}>Tap + to add one</p>
        </div>
      ) : (
        <div className="card" style={{ padding:0,overflow:"hidden" }}>
          {filtered.map(txn=>{
            const cat = CATEGORIES[txn.category as keyof typeof CATEGORIES];
            return (
              <div key={txn.id} style={{ borderBottom:"1px solid var(--border)" }}>
                {/* main row */}
                <div className="txn-item" style={{ cursor:"pointer" }}
                  onClick={()=>setViewTxn(viewTxn?.id===txn.id?null:txn)}>
                  <div className="txn-icon" style={{ background:(cat?.color||"#888")+"22",fontSize:18 }}>
                    {cat?.emoji||"📦"}
                  </div>
                  <div className="txn-info">
                    <div className="txn-title">{txn.title}</div>
                    <div className="txn-cat">
                      {cat?.label||txn.category} · {format(new Date(txn.date),"dd MMM")}
                      {txn.receipt_url&&<span style={{ marginLeft:6,fontSize:10,color:"var(--green-dark)" }}>📎</span>}
                    </div>
                  </div>
                  <div style={{ textAlign:"right",flexShrink:0 }}>
                    <div className="txn-amount" style={{ color:txn.type==="income"?"var(--green)":"var(--red)" }}>
                      {txn.type==="income"?"+":"-"}₹{txn.amount.toLocaleString("en-IN")}
                    </div>
                    <div style={{ fontSize:11,color:"var(--text-muted)",marginTop:2 }}>
                      {viewTxn?.id===txn.id?"▲ collapse":"▼ details"}
                    </div>
                  </div>
                </div>

                {/* expandable detail panel */}
                {viewTxn?.id===txn.id&&(
                  <div style={{ padding:"10px 16px 14px",background:"var(--bg)",borderTop:"1px solid var(--border)" }}>
                    {txn.note&&(
                      <p style={{ fontSize:12,color:"var(--text-secondary)",marginBottom:10 }}>📝 {txn.note}</p>
                    )}
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10 }}>
                      <div>
                        <p style={{ fontSize:11,color:"var(--text-muted)",marginBottom:4 }}>Receipt / Bill</p>
                        <ReceiptCell txn={txn} userId={userId} onUpdated={handleReceiptUpdate}/>
                      </div>
                      <button onClick={()=>deleteTxn(txn.id)}
                        style={{ padding:"6px 14px",borderRadius:8,background:"var(--red-light)",
                          color:"var(--red)",border:"none",cursor:"pointer",fontSize:12,fontWeight:600 }}>
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ height:16 }}/>
      <BottomNav/>
      <AddFAB userId={userId} onAdded={()=>loadAll(userId)}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Add Transaction FAB ─────────────────────────────────────────────────────
function AddFAB({ userId, onAdded }: { userId:string; onAdded:()=>void }) {
  const [open, setOpen]         = useState(false);
  const [title, setTitle]       = useState("");
  const [amount, setAmount]     = useState("");
  const [type, setType]         = useState<"expense"|"income">("expense");
  const [category, setCategory] = useState("food");
  const [date, setDate]         = useState(format(new Date(),"yyyy-MM-dd"));
  const [note, setNote]         = useState("");
  const [receiptFile, setReceiptFile] = useState<File|null>(null);
  const [saving, setSaving]     = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function save() {
    if (!title.trim()||!amount) return;
    setSaving(true);

    // Insert transaction first to get its ID
    const { data: newTxn, error } = await supabase.from("transactions")
      .insert({ user_id:userId, title:title.trim(), amount:parseFloat(amount), type, category, date, note:note.trim()||null })
      .select().single();

    if (!error && newTxn && receiptFile) {
      const url = await uploadReceipt(userId, newTxn.id, receiptFile);
      if (url) await supabase.from("transactions").update({ receipt_url: url }).eq("id", newTxn.id);
    }

    setSaving(false); setOpen(false);
    setTitle(""); setAmount(""); setNote(""); setType("expense"); setCategory("food"); setReceiptFile(null);
    onAdded();
  }

  return (
    <>
      <button className="fab" onClick={()=>setOpen(true)} aria-label="Add">+</button>
      {open&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setOpen(false)}>
          <div className="modal-sheet">
            <div className="modal-handle"/>
            <p className="modal-title">Add Transaction</p>

            <div className="type-toggle">
              <button className={`type-btn ${type==="expense"?"active-expense":""}`} onClick={()=>setType("expense")}>💸 Expense</button>
              <button className={`type-btn ${type==="income"?"active-income":""}`}   onClick={()=>setType("income")}>💰 Income</button>
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

            <div className="form-group">
              <label className="form-label">Note (optional)</label>
              <input className="form-input" placeholder="e.g. Team lunch" value={note} onChange={e=>setNote(e.target.value)}/>
            </div>

            {/* Receipt upload inside add form */}
            <div className="form-group" style={{ marginBottom:20 }}>
              <label className="form-label">📎 Receipt / Bill (optional)</label>
              <input ref={fileRef} type="file" accept="image/*,application/pdf"
                style={{ display:"none" }} onChange={e=>setReceiptFile(e.target.files?.[0]||null)}/>
              <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                <button type="button" onClick={()=>fileRef.current?.click()}
                  style={{ padding:"9px 16px",borderRadius:8,border:"1px dashed var(--border)",
                    background:"var(--bg)",fontSize:13,color:"var(--text-secondary)",cursor:"pointer" }}>
                  {receiptFile ? "📎 "+receiptFile.name.slice(0,20) : "Choose file"}
                </button>
                {receiptFile&&(
                  <button onClick={()=>setReceiptFile(null)}
                    style={{ background:"none",border:"none",color:"var(--red)",cursor:"pointer",fontSize:18 }}>×</button>
                )}
              </div>
              <p style={{ fontSize:11,color:"var(--text-muted)",marginTop:4 }}>Max 5 MB · JPG, PNG, PDF</p>
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
