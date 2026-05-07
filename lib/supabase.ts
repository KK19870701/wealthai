import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---- Types ----
export type Transaction = {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
  note?: string;
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

// ---- CATEGORY CONFIG ----
export const CATEGORIES = {
  food:          { label: "Food & Dining",    emoji: "🍔", color: "#1D9E75" },
  transport:     { label: "Transport",        emoji: "🚗", color: "#378ADD" },
  shopping:      { label: "Shopping",         emoji: "🛍️", color: "#EF9F27" },
  bills:         { label: "Bills & Utilities",emoji: "🏠", color: "#D4537E" },
  health:        { label: "Health",           emoji: "💊", color: "#D85A30" },
  entertainment: { label: "Entertainment",    emoji: "🎬", color: "#7F77DD" },
  salary:        { label: "Salary",           emoji: "💼", color: "#1D9E75" },
  freelance:     { label: "Freelance",        emoji: "💻", color: "#1D9E75" },
  other:         { label: "Other",            emoji: "📦", color: "#888780" },
};

// ---- AUTO CATEGORIZE by keywords ----
export function autoCategory(title: string): string {
  const t = title.toLowerCase();
  if (/swiggy|zomato|uber eat|restaurant|cafe|food|lunch|dinner|chai/.test(t)) return "food";
  if (/ola|uber|rapido|petrol|fuel|metro|bus|train|flight/.test(t)) return "transport";
  if (/amazon|flipkart|myntra|meesho|nykaa|shop|store|mall/.test(t)) return "shopping";
  if (/rent|electricity|jio|airtel|vi |water|gas|wifi|broadband/.test(t)) return "bills";
  if (/apollo|medplus|doctor|hospital|pharmacy|medicine|clinic/.test(t)) return "health";
  if (/netflix|spotify|hotstar|prime|youtube|movie|game/.test(t)) return "entertainment";
  if (/salary|payroll|tcs|infosys|wipro|ctc|hike/.test(t)) return "salary";
  if (/freelance|client|invoice|upwork|fiverr/.test(t)) return "freelance";
  return "other";
}
