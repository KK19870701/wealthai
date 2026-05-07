"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, Bill, CATEGORIES } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

export default function BillsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("1");
  const [category, setCategory] = useState("bills");
  const today = new Date().getDate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/login"); return; }
      setUserId(session.user.id);
      loadBills(session.user.id);
    });
  }, []);

  async function loadBills(uid: string) {
    const { data } = await supabase.from("bills").select("*").eq("user_id", uid).eq("is_active", true).order("due_day");
    setBills(data || []);
    setLoading(false);
  }

  async function addBill() {
    if (!name || !amount) return;
    await supabase.from("bills").insert({ user_id: userId, name, amount: parseFloat(amount), due_day: parseInt(dueDay), category });
    setOpen(false); setName(""); setAmount(""); setDueDay("1");
    loadBills(userId);
  }

  async function deleteBill(id: string) {
    await supabase.from("bills").update({ is_active: false }).eq("id", id);
    loadBills(userId);
  }

  function getStatus(dueDay: number): { label: string; color: string; bg: string } {
    const diff = dueDay - today;
    if (diff < 0) return { label: "Overdue", color: "var(--red)", bg: "var(--red-light)" };
    if (diff <= 3) return { label: `Due in ${diff}d`, color: "var(--red)", bg: "var(--red-light)" };
    if (diff <= 7) return { label: `Due in ${diff}d`, color: "var(--amber)", bg: "var(--amber-light)" };
    return { label: `${diff} days`, color: "var(--green)", bg: "var(--green-light)" };
  }

  const total = bills.reduce((s, b) => s + b.amount, 0);

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}><p style={{ color: "var(--text-muted)" }}>Loading...</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Bill Reminders 🔔</h1>
        <p>Total monthly: ₹{total.toLocaleString("en-IN")} across {bills.length} bills</p>
      </div>

      {bills.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
          <p style={{ fontSize: 15, fontWeight: 500 }}>No bills added yet</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Tap + to add your first bill reminder</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {bills.map(bill => {
            const cat = CATEGORIES[bill.category as keyof typeof CATEGORIES];
            const status = getStatus(bill.due_day);
            return (
              <div key={bill.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: cat?.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                  {cat?.emoji || "🏠"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{bill.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Every {bill.due_day}{["st","nd","rd","th"][Math.min(bill.due_day-1,3)]} of month</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>₹{bill.amount.toLocaleString("en-IN")}</div>
                  <div style={{ fontSize: 10, background: status.bg, color: status.color, padding: "2px 6px", borderRadius: 10, fontWeight: 600, marginTop: 3 }}>{status.label}</div>
                </div>
                <button onClick={() => deleteBill(bill.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px", marginLeft: 4 }}>✕</button>
              </div>
            );
          })}
        </div>
      )}

      <button className="fab" onClick={() => setOpen(true)} aria-label="Add bill">+</button>

      {open && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <p className="modal-title">Add Bill Reminder</p>
            <div className="form-group">
              <label className="form-label">Bill Name</label>
              <input className="form-input" placeholder="e.g. Airtel Postpaid" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input className="form-input" type="number" inputMode="decimal" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Due Day (1–31)</label>
              <input className="form-input" type="number" inputMode="numeric" min="1" max="31" value={dueDay} onChange={e => setDueDay(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Category</label>
              <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
              </select>
            </div>
            <button className="btn btn-primary" onClick={addBill}>Add Bill</button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
