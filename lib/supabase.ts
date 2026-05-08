import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnon);

// ── Types ──────────────────────────────────────────────────────────────────

export type Transaction = {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
  note?: string;
  receipt_url?: string;   // ← NEW: Supabase Storage public URL
  created_at: string;
};

export type Budget = {
  id: string;
  user_id: string;
  category: string;
  limit_amount: number;
  month: number;
  year: number;
};

export type Bill = {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_day: number;
  category: string;
  is_active: boolean;
};

// ── Category config ────────────────────────────────────────────────────────

export const CATEGORIES = {
  food:          { label: "Food & Dining",     emoji: "🍔", color: "#1D9E75" },
  transport:     { label: "Transport",         emoji: "🚗", color: "#378ADD" },
  shopping:      { label: "Shopping",          emoji: "🛍️", color: "#EF9F27" },
  bills:         { label: "Bills & Utilities", emoji: "🏠", color: "#D4537E" },
  health:        { label: "Health",            emoji: "💊", color: "#D85A30" },
  entertainment: { label: "Entertainment",     emoji: "🎬", color: "#7F77DD" },
  salary:        { label: "Salary",            emoji: "💼", color: "#1D9E75" },
  freelance:     { label: "Freelance",         emoji: "💻", color: "#0F6E56" },
  other:         { label: "Other",             emoji: "📦", color: "#888780" },
};

// ── Auto-categorise by keyword ─────────────────────────────────────────────

export function autoCategory(title: string): string {
  const t = title.toLowerCase();
  if (/swiggy|zomato|uber eat|restaurant|cafe|food|lunch|dinner|chai|dhaba/.test(t)) return "food";
  if (/ola|uber|rapido|petrol|fuel|metro|bus|train|flight|toll/.test(t))              return "transport";
  if (/amazon|flipkart|myntra|meesho|nykaa|shop|store|mall|blinkit/.test(t))         return "shopping";
  if (/rent|electricity|jio|airtel|vi |water|gas|wifi|broadband|recharge/.test(t))   return "bills";
  if (/apollo|medplus|doctor|hospital|pharmacy|medicine|clinic|lab/.test(t))         return "health";
  if (/netflix|spotify|hotstar|prime|youtube|movie|game|disney/.test(t))             return "entertainment";
  if (/salary|payroll|tcs|infosys|wipro|ctc|hike|stipend/.test(t))                  return "salary";
  if (/freelance|client|invoice|upwork|fiverr|project/.test(t))                     return "freelance";
  return "other";
}

// ── Receipt Storage helpers ────────────────────────────────────────────────

const BUCKET = "receipts";

/**
 * Upload a receipt image to Supabase Storage.
 * Returns the public URL or null on failure.
 */
export async function uploadReceipt(
  userId: string,
  txnId: string,
  file: File
): Promise<string | null> {
  const ext  = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${txnId}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) { console.error("Receipt upload error:", error); return null; }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Delete a receipt from storage.
 */
export async function deleteReceipt(userId: string, txnId: string, ext = "jpg") {
  await supabase.storage.from(BUCKET).remove([`${userId}/${txnId}.${ext}`]);
}
