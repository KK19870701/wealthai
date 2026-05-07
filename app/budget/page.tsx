"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, CATEGORIES } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import { format, startOfMonth, endOfMonth } from "date-fns";

export default function BudgetPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [budgets, setBudgets] = useState<any[]>([]);
  const [spent, setSpent] = useState<Record<string, number>>({});
  const [editCat, setEditCat] = useState<string | null>(null);
  const [editAmt, setEditAmt] = useState("");
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/login"); return; }
      setUserId(session.user.id);
      loadData(session.user.id);
    });
  }, []);

  async function loadData(uid: string) {
    const start = format(startOfMonth(now), "yyyy-MM-dd");
    const end = format(endOfMonth(now), "yyyy-MM-dd");
    const [budgetRes, txnRes] = await Promise.all([
      supabase.from("budgets").select("*").eq("user_id", uid).eq("month", month).eq("year", year),
      supabase.from("transactions").select("*").eq("user_id", uid).eq("type", "expense").gte("date", start).lte("date", end)
    ]);
    setBudgets(budgetRes.data || []);
    const spentMap: Record<string, number> = {};
    (txnRes.data || []).forEach((t: any) => { spentMap[t.category] = (spentMap[t.category] || 0) + t.amount; });
    setSpent(spentMap);
    setLoading(false);
  }

  async function saveBudget() {
    if (!editCat || !editAmt) return;
    await supabase.from("budgets").upsert({ user_id: userId, category: editCat, limit_amount: parseFloat(editAmt), month, year });
    setEditCat(null); setEditAmt("");
    loadData(userId);
  }

  const expenseCategories = ["food","transport","shopping","bills","health","entertainment","other"];

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}><p style={{ color: "var(--text-muted)" }}>Loading...</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Budget Planning</h1>
        <p>{format(now, "MMMM yyyy")} — tap any category to set budget</p>
      </div>

      {expenseCategories.map(key => {
        const cat = CATEGORIES[key as keyof typeof CATEGORIES];
        const spentAmt = spent[key] || 0;
        const budget = budgets.find(b => b.category === key);
        const limit = budget?.limit_amount || 0;
        const pct = limit > 0 ? Math.min((spentAmt / limit) * 100, 100) : 0;
        const over = limit > 0 && spentAmt > limit;

        return (
          <div key={key} className="card" style={{ cursor: "pointer" }}
            onClick={() => { setEditCat(key); setEditAmt(limit > 0 ? String(limit) : ""); }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 22 }}>{cat.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{cat.label}</span>
                  {over && <span style={{ fontSize: 10, background: "var(--red-light)", color: "var(--red)", padding: "2px 6px", borderRadius: 10, fontWeight: 600 }}>Over budget!</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  Spent ₹{spentAmt.toLocaleString("en-IN")}{limit > 0 ? ` / ₹${limit.toLocaleString("en-IN")}` : " — tap to set budget"}
                </div>
              </div>
            </div>
            {limit > 0 && (
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${pct}%`, background: over ? "var(--red)" : pct > 80 ? "var(--amber)" : cat.color }} />
              </div>
            )}
          </div>
        );
      })}

      {editCat && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditCat(null)}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <p className="modal-title">Set Budget — {CATEGORIES[editCat as keyof typeof CATEGORIES]?.label}</p>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Monthly Budget (₹)</label>
              <input className="form-input" type="number" inputMode="decimal" placeholder="e.g. 10000" value={editAmt} onChange={e => setEditAmt(e.target.value)} autoFocus />
            </div>
            <button className="btn btn-primary" onClick={saveBudget}>Save Budget</button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
