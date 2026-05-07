"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, Transaction, CATEGORIES } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import { format, startOfMonth, endOfMonth } from "date-fns";

export default function ExpensesPage() {
  const router = useRouter();
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/login"); return; }
      setUserId(session.user.id);
      loadTxns(session.user.id);
    });
  }, []);

  async function loadTxns(uid: string) {
    const now = new Date();
    const start = format(startOfMonth(now), "yyyy-MM-dd");
    const end = format(endOfMonth(now), "yyyy-MM-dd");
    const { data } = await supabase.from("transactions").select("*")
      .eq("user_id", uid).gte("date", start).lte("date", end)
      .order("date", { ascending: false });
    setTxns(data || []);
    setLoading(false);
  }

  async function deleteTxn(id: string) {
    await supabase.from("transactions").delete().eq("id", id);
    setTxns(prev => prev.filter(t => t.id !== id));
  }

  const filtered = txns.filter(t => {
    if (filter !== "all" && t.category !== filter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalExpense = filtered.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const totalIncome = filtered.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}><p style={{ color: "var(--text-muted)" }}>Loading...</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Expenses</h1>
        <p>{format(new Date(), "MMMM yyyy")} — {txns.length} transactions</p>
      </div>

      <div style={{ padding: "0 16px 12px", display: "flex", gap: 8 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search transactions..."
          style={{ flex: 1, padding: "10px 14px", borderRadius: 22, border: "1px solid var(--border)", fontSize: 13, outline: "none", background: "var(--card)" }} />
      </div>

      <div style={{ display: "flex", gap: 6, padding: "0 16px 12px", overflowX: "auto" }}>
        {[["all", "All", ""], ...Object.entries(CATEGORIES).map(([k, v]) => [k, v.emoji + " " + v.label.split(" ")[0], v.color])].map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key as string)}
            style={{ whiteSpace: "nowrap", padding: "6px 12px", borderRadius: 20, border: `1px solid ${filter === key ? "var(--green)" : "var(--border)"}`,
              background: filter === key ? "var(--green-light)" : "var(--card)", color: filter === key ? "var(--green-dark)" : "var(--text-secondary)",
              fontSize: 12, fontWeight: filter === key ? 600 : 400, cursor: "pointer", flexShrink: 0 }}>
            {label}
          </button>
        ))}
      </div>

      <div className="metric-row" style={{ marginBottom: 12 }}>
        <div className="metric-card"><div className="metric-label">Expenses</div><div className="metric-value down">₹{totalExpense.toLocaleString("en-IN")}</div></div>
        <div className="metric-card"><div className="metric-label">Income</div><div className="metric-value up">₹{totalIncome.toLocaleString("en-IN")}</div></div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
          <p>No transactions found</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {filtered.map(txn => {
            const cat = CATEGORIES[txn.category as keyof typeof CATEGORIES];
            return (
              <div key={txn.id} className="txn-item">
                <div className="txn-icon" style={{ background: cat?.color + "22" }}>{cat?.emoji || "📦"}</div>
                <div className="txn-info">
                  <div className="txn-title">{txn.title}</div>
                  <div className="txn-cat">{cat?.label || txn.category} · {format(new Date(txn.date), "dd MMM")}</div>
                </div>
                <div>
                  <div className="txn-amount" style={{ color: txn.type === "income" ? "var(--green)" : "var(--red)" }}>
                    {txn.type === "income" ? "+" : "-"}₹{txn.amount.toLocaleString("en-IN")}
                  </div>
                  <button onClick={() => deleteTxn(txn.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 11, marginTop: 4, display: "block", marginLeft: "auto" }}>
                    delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
