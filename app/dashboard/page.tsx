"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, Transaction, CATEGORIES } from "@/lib/supabase";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import BottomNav from "@/components/BottomNav";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/login"); return; }
      setUser(session.user);
      loadData(session.user.id);
    });
  }, []);

  async function loadData(uid: string) {
    const now = new Date();
    const start = format(startOfMonth(now), "yyyy-MM-dd");
    const end = format(endOfMonth(now), "yyyy-MM-dd");

    const [profileRes, txnRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).single(),
      supabase.from("transactions").select("*").eq("user_id", uid)
        .gte("date", start).lte("date", end).order("date", { ascending: false })
    ]);
    setProfile(profileRes.data);
    setTxns(txnRes.data || []);
    setLoading(false);
  }

  const income = txns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = txns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const savings = income - expenses;
  const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(1) : "0";

  // Category breakdown
  const catData = Object.entries(CATEGORIES).map(([key, cat]) => ({
    name: cat.emoji + " " + cat.label.split(" ")[0],
    amount: txns.filter(t => t.type === "expense" && t.category === key).reduce((s, t) => s + t.amount, 0),
    color: cat.color
  })).filter(d => d.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 5);

  const recentTxns = txns.slice(0, 5);
  const name = profile?.full_name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}><p style={{ color: "var(--text-muted)" }}>Loading...</p></div>;

  return (
    <div className="page">
      <div style={{ background: "var(--green)", padding: "52px 20px 20px", color: "white" }}>
        <p style={{ fontSize: 13, opacity: 0.85 }}>{greeting}, {name} 👋</p>
        <p style={{ fontSize: 12, opacity: 0.7 }}>{format(new Date(), "MMMM yyyy")}</p>
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 12, opacity: 0.8 }}>Net Savings this month</p>
          <p style={{ fontSize: 34, fontWeight: 700, marginTop: 4 }}>
            ₹{savings.toLocaleString("en-IN")}
          </p>
          <p style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>Savings rate: {savingsRate}%</p>
        </div>
      </div>

      <div className="metric-row" style={{ marginTop: 16 }}>
        <div className="metric-card">
          <div className="metric-label">Income</div>
          <div className="metric-value up">₹{income.toLocaleString("en-IN")}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Expenses</div>
          <div className="metric-value down">₹{expenses.toLocaleString("en-IN")}</div>
        </div>
      </div>

      {catData.length > 0 && (
        <div className="card">
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14 }}>Spending by Category</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={catData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: any) => ["₹" + v.toLocaleString("en-IN"), "Spent"]} />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {catData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {recentTxns.length > 0 ? (
        <>
          <p className="section-title" style={{ marginTop: 8 }}>Recent Transactions</p>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {recentTxns.map(txn => {
              const cat = CATEGORIES[txn.category as keyof typeof CATEGORIES];
              return (
                <div key={txn.id} className="txn-item">
                  <div className="txn-icon" style={{ background: cat?.color + "22", fontSize: 18 }}>{cat?.emoji || "📦"}</div>
                  <div className="txn-info">
                    <div className="txn-title">{txn.title}</div>
                    <div className="txn-cat">{cat?.label || txn.category}</div>
                  </div>
                  <div>
                    <div className="txn-amount" style={{ color: txn.type === "income" ? "var(--green)" : "var(--red)" }}>
                      {txn.type === "income" ? "+" : "-"}₹{txn.amount.toLocaleString("en-IN")}
                    </div>
                    <div className="txn-date">{format(new Date(txn.date), "dd MMM")}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <p style={{ fontSize: 15, fontWeight: 500 }}>No transactions yet</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Tap + to add your first transaction</p>
        </div>
      )}

      <BottomNav />
      <AddTransactionFAB userId={user?.id} onAdded={() => loadData(user?.id)} />
    </div>
  );
}

function AddTransactionFAB({ userId, onAdded }: { userId: string, onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [category, setCategory] = useState("food");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);
  const { autoCategory } = require("@/lib/supabase");

  async function save() {
    if (!title || !amount) return;
    setLoading(true);
    await supabase.from("transactions").insert({
      user_id: userId, title, amount: parseFloat(amount), type, category, date
    });
    setLoading(false);
    setOpen(false);
    setTitle(""); setAmount(""); setType("expense"); setCategory("food");
    onAdded();
  }

  return (
    <>
      <button className="fab" onClick={() => setOpen(true)} aria-label="Add transaction">+</button>
      {open && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <p className="modal-title">Add Transaction</p>
            <div className="type-toggle">
              <button className={`type-btn ${type === "expense" ? "active-expense" : ""}`} onClick={() => setType("expense")}>Expense</button>
              <button className={`type-btn ${type === "income" ? "active-income" : ""}`} onClick={() => setType("income")}>Income</button>
            </div>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-input" placeholder="e.g. Swiggy Order" value={title}
                onChange={e => { setTitle(e.target.value); if (type === "expense") setCategory(autoCategory(e.target.value)); }} />
            </div>
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input className="form-input" type="number" inputMode="decimal" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Category (auto-detected)</label>
              <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={save} disabled={loading}>
              {loading ? "Saving..." : "Save Transaction"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
