"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

export default function ProfilePage() {
  const router = useRouter();
  const [uid, setUid]         = useState("");
  const [name, setName]       = useState("");
  const [income, setIncome]   = useState("");
  const [goal, setGoal]       = useState("");
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/login"); return; }
      setUid(session.user.id);
      const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (data) {
        setName(data.full_name || "");
        setIncome(data.monthly_income ? String(data.monthly_income) : "");
        setGoal(data.savings_goal ? String(data.savings_goal) : "");
      }
      setLoading(false);
    });
  }, []);

  async function save() {
    setSaving(true); setMsg("");
    await supabase.from("profiles").update({
      full_name: name,
      monthly_income: parseFloat(income) || 0,
      savings_goal: parseFloat(goal) || 0,
    }).eq("id", uid);
    setSaving(false);
    setMsg("✅ Profile saved!");
    setTimeout(() => setMsg(""), 3000);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100vh" }}>
      <p style={{ color:"var(--text-muted)" }}>Loading…</p>
    </div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>Profile & Goals ⚙️</h1>
        <p>Set your income and annual savings goal</p>
      </div>

      <div className="card">
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input className="form-input" value={name} onChange={e=>setName(e.target.value)} placeholder="Rahul Sharma"/>
        </div>
        <div className="form-group">
          <label className="form-label">Monthly Income (₹)</label>
          <input className="form-input" type="number" inputMode="decimal" value={income} onChange={e=>setIncome(e.target.value)} placeholder="e.g. 85000"/>
          <p style={{ fontSize:11,color:"var(--text-muted)",marginTop:4 }}>AI advisor हे use करतो accurate advice साठी</p>
        </div>
        <div className="form-group" style={{ marginBottom:20 }}>
          <label className="form-label">🎯 Annual Savings Goal (₹)</label>
          <input className="form-input" type="number" inputMode="decimal" value={goal} onChange={e=>setGoal(e.target.value)} placeholder="e.g. 500000"/>
          <p style={{ fontSize:11,color:"var(--text-muted)",marginTop:4 }}>Dashboard वर goal tracker आणि predictions दिसतात</p>
        </div>
        {msg && <p style={{ color:"var(--green)",fontSize:13,marginBottom:12,textAlign:"center" }}>{msg}</p>}
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </div>

      <div className="card" style={{ marginTop:8 }}>
        <p style={{ fontSize:13,fontWeight:600,marginBottom:12 }}>Account</p>
        <button className="btn btn-danger" onClick={logout}>Logout</button>
      </div>

      <BottomNav/>
    </div>
  );
}
