"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSubmit() {
    if (!email || !password) return setMsg("Please fill all fields");
    setLoading(true);
    setMsg("");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
      else router.replace("/dashboard");
    } else {
      if (!name) return setMsg("Please enter your name");
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name } }
      });
      if (error) setMsg(error.message);
      else setMsg("✅ Account created! Please check email to verify, then login.");
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px" }}>
      <div style={{ marginBottom: 36, textAlign: "center" }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>💰</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)" }}>WealthAI</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>Smart money tracker for Indians</p>
      </div>

      <div style={{ display: "flex", background: "var(--bg)", borderRadius: "var(--radius-sm)", padding: 3, marginBottom: 20 }}>
        {(["login", "signup"] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); setMsg(""); }}
            style={{ flex: 1, padding: "9px", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: "pointer",
              background: mode === m ? "white" : "transparent",
              color: mode === m ? "var(--text-primary)" : "var(--text-muted)",
              boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
            {m === "login" ? "Login" : "Sign Up"}
          </button>
        ))}
      </div>

      {mode === "signup" && (
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input className="form-input" placeholder="Rahul Sharma" value={name} onChange={e => setName(e.target.value)} />
        </div>
      )}
      <div className="form-group">
        <label className="form-label">Email</label>
        <input className="form-input" type="email" placeholder="rahul@example.com" value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <div className="form-group" style={{ marginBottom: 20 }}>
        <label className="form-label">Password</label>
        <input className="form-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()} />
      </div>

      {msg && <p style={{ color: msg.startsWith("✅") ? "var(--green)" : "var(--red)", fontSize: 13, marginBottom: 14, textAlign: "center" }}>{msg}</p>}

      <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
        {loading ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
      </button>

      <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", marginTop: 24 }}>
        Your financial data is private and secure 🔒
      </p>
    </div>
  );
}
