import { Transaction, Budget, Bill, CATEGORIES } from "./supabase";
import {
  format, startOfMonth, endOfMonth, subMonths,
  differenceInMonths, getDaysInMonth, getDate
} from "date-fns";

// ── Types ──────────────────────────────────────────────────────────────────

export type MonthlySnapshot = {
  month: string;        // "Jan", "Feb" …
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
};

export type CategorySpend = {
  category: string;
  label: string;
  emoji: string;
  amount: number;
  pct: number;
  budget?: number;
  overBudget: boolean;
};

export type HealthScore = {
  score: number;         // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  label: string;
  breakdown: { label: string; score: number; max: number; tip: string }[];
};

export type AIContext = {
  name: string;
  currentMonth: string;
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
  annualGoal: number;
  goalProgress: number;         // 0-100 %
  goalOnTrack: boolean;
  predictedYearEnd: number;
  monthsToGoal: number | null;
  categoryBreakdown: CategorySpend[];
  topSpendCategory: CategorySpend | null;
  overspentCategories: CategorySpend[];
  trends: MonthlySnapshot[];    // last 5 months
  healthScore: HealthScore;
  billsDueSoon: { name: string; amount: number; dueDay: number }[];
  daysIntoMonth: number;
  daysInMonth: number;
};

// ── Main Analysis Function ─────────────────────────────────────────────────

export function analyzeFinances(
  profile: any,
  currentTxns: Transaction[],
  budgets: Budget[],
  bills: Bill[],
  historicalTxns: Transaction[]
): AIContext {
  const now = new Date();
  const daysIntoMonth = getDate(now);
  const daysInMonth = getDaysInMonth(now);

  // Current month income / expenses
  const income = sum(currentTxns, t => t.type === "income" ? t.amount : 0);
  const expenses = sum(currentTxns, t => t.type === "expense" ? t.amount : 0);
  const savings = income - expenses;
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;

  // Category breakdown
  const totalExpense = expenses || 1;
  const categoryBreakdown: CategorySpend[] = Object.entries(CATEGORIES)
    .map(([key, cat]) => {
      const amount = sum(currentTxns, t =>
        t.type === "expense" && t.category === key ? t.amount : 0
      );
      const budget = budgets.find(b => b.category === key)?.limit_amount;
      return {
        category: key,
        label: cat.label,
        emoji: cat.emoji,
        amount,
        pct: parseFloat(((amount / totalExpense) * 100).toFixed(1)),
        budget,
        overBudget: budget ? amount > budget : false,
      };
    })
    .filter(c => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const topSpendCategory = categoryBreakdown[0] ?? null;
  const overspentCategories = categoryBreakdown.filter(c => c.overBudget);

  // Monthly trends — last 5 months
  const trends: MonthlySnapshot[] = [];
  for (let i = 4; i >= 0; i--) {
    const d = subMonths(now, i);
    const start = format(startOfMonth(d), "yyyy-MM-dd");
    const end   = format(endOfMonth(d), "yyyy-MM-dd");
    const monthTxns = historicalTxns.filter(t => t.date >= start && t.date <= end);
    const mIncome   = sum(monthTxns, t => t.type === "income" ? t.amount : 0);
    const mExpenses = sum(monthTxns, t => t.type === "expense" ? t.amount : 0);
    const mSavings  = mIncome - mExpenses;
    trends.push({
      month: format(d, "MMM"),
      income: mIncome,
      expenses: mExpenses,
      savings: mSavings,
      savingsRate: mIncome > 0 ? parseFloat(((mSavings / mIncome) * 100).toFixed(1)) : 0,
    });
  }

  // Annual goal tracking
  const annualGoal = profile?.savings_goal || 0;
  const avgMonthlySavings = trends.length > 0
    ? trends.reduce((s, t) => s + t.savings, 0) / trends.length
    : savings;
  const predictedYearEnd = Math.max(0, avgMonthlySavings * 12);
  const goalProgress = annualGoal > 0
    ? Math.min(100, parseFloat(((predictedYearEnd / annualGoal) * 100).toFixed(1)))
    : 0;
  const goalOnTrack = goalProgress >= 90;
  const monthsToGoal = annualGoal > 0 && avgMonthlySavings > 0
    ? Math.ceil(annualGoal / avgMonthlySavings)
    : null;

  // Bills due soon (next 7 days)
  const today = getDate(now);
  const billsDueSoon = bills
    .filter(b => b.is_active && b.due_day >= today && b.due_day <= today + 7)
    .map(b => ({ name: b.name, amount: b.amount, dueDay: b.due_day }));

  // Health score
  const healthScore = calcHealthScore(savingsRate, overspentCategories.length,
    categoryBreakdown, annualGoal, goalProgress, income);

  return {
    name: profile?.full_name?.split(" ")[0] || "User",
    currentMonth: format(now, "MMMM yyyy"),
    income, expenses, savings, savingsRate,
    annualGoal, goalProgress, goalOnTrack,
    predictedYearEnd, monthsToGoal,
    categoryBreakdown, topSpendCategory, overspentCategories,
    trends, healthScore, billsDueSoon,
    daysIntoMonth, daysInMonth,
  };
}

// ── Health Score ───────────────────────────────────────────────────────────

function calcHealthScore(
  savingsRate: number,
  overspentCount: number,
  cats: CategorySpend[],
  annualGoal: number,
  goalProgress: number,
  income: number
): HealthScore {
  const breakdown = [
    {
      label: "Savings rate",
      score: clamp(Math.round(savingsRate / 50 * 30), 0, 30),
      max: 30,
      tip: savingsRate < 20
        ? "Income च्या 20% तरी save करण्याचे target ठेवा"
        : "Excellent savings rate!",
    },
    {
      label: "Budget control",
      score: clamp(25 - overspentCount * 8, 0, 25),
      max: 25,
      tip: overspentCount > 0
        ? `${overspentCount} categories budget ओलांडल्या आहेत`
        : "Budget अगदी control मध्ये आहे!",
    },
    {
      label: "Goal progress",
      score: annualGoal > 0 ? clamp(Math.round(goalProgress / 100 * 25), 0, 25) : 12,
      max: 25,
      tip: annualGoal > 0
        ? (goalProgress < 80 ? "Annual goal साठी savings rate वाढवा" : "Goal track वर आहे!")
        : "Annual savings goal set करा",
    },
    {
      label: "Income stability",
      score: income > 0 ? 20 : 0,
      max: 20,
      tip: income === 0 ? "या महिन्यात income नाही recorded" : "Income recorded आहे",
    },
  ];

  const total = breakdown.reduce((s, b) => s + b.score, 0);
  let grade: HealthScore["grade"] = "F";
  let label = "Critical";
  if (total >= 85) { grade = "A"; label = "Excellent 🌟"; }
  else if (total >= 70) { grade = "B"; label = "Good 👍"; }
  else if (total >= 55) { grade = "C"; label = "Average ⚠️"; }
  else if (total >= 40) { grade = "D"; label = "Needs work 📉"; }

  return { score: total, grade, label, breakdown };
}

// ── Build AI system prompt from real data ─────────────────────────────────

export function buildSystemPrompt(ctx: AIContext): string {
  const catSummary = ctx.categoryBreakdown
    .map(c => `${c.emoji}${c.label}: ₹${fmt(c.amount)}${
      c.budget ? ` / ₹${fmt(c.budget)} budget${c.overBudget ? " ⚠️ OVER" : ""}` : ""
    }`)
    .join(", ");

  const trendSummary = ctx.trends
    .map(t => `${t.month}: income ₹${fmt(t.income)}, spent ₹${fmt(t.expenses)}, saved ₹${fmt(t.savings)}`)
    .join(" | ");

  const billsAlert = ctx.billsDueSoon.length > 0
    ? `Bills due soon: ${ctx.billsDueSoon.map(b => `${b.name} ₹${fmt(b.amount)} on ${b.dueDay}th`).join(", ")}.`
    : "No bills due in next 7 days.";

  return `You are a smart, empathetic personal finance AI advisor for an Indian user.
You have their REAL financial data. Give specific, actionable advice — not generic tips.
Respond in the same language as the question: if Marathi, reply in Marathi; if English, in English. Mix naturally.
Keep responses under 120 words. Be warm, specific, and practical.
Recommend Indian products when relevant: SIP, PPF, FD (HDFC/SBI), NPS, ELSS, Zerodha Kite, Groww.
Always add "⚠️ Disclaimer: हे investment advice नाही, फक्त माहिती आहे." for investment questions.

=== REAL USER DATA — ${ctx.currentMonth} ===
Name: ${ctx.name}
Income: ₹${fmt(ctx.income)} | Expenses: ₹${fmt(ctx.expenses)} | Savings: ₹${fmt(ctx.savings)}
Savings rate: ${ctx.savingsRate.toFixed(1)}% (healthy = 20%+)
Financial health score: ${ctx.healthScore.score}/100 (${ctx.healthScore.grade} — ${ctx.healthScore.label})
Progress in month: ${ctx.daysIntoMonth}/${ctx.daysInMonth} days

Category breakdown: ${catSummary || "No expenses recorded yet"}
${ctx.overspentCategories.length > 0 ? `⚠️ Over budget: ${ctx.overspentCategories.map(c => c.label).join(", ")}` : "All categories within budget ✅"}
Top spending: ${ctx.topSpendCategory ? `${ctx.topSpendCategory.emoji}${ctx.topSpendCategory.label} (${ctx.topSpendCategory.pct}%)` : "N/A"}

Annual savings goal: ₹${fmt(ctx.annualGoal)} | Progress: ${ctx.goalProgress}% | On track: ${ctx.goalOnTrack ? "YES ✅" : "NO ⚠️"}
Predicted year-end savings: ₹${fmt(ctx.predictedYearEnd)}
${ctx.monthsToGoal ? `Months to reach goal at current rate: ${ctx.monthsToGoal}` : ""}

Monthly trends (last 5 months): ${trendSummary || "No historical data"}
${billsAlert}`;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const sum = (arr: any[], fn: (x: any) => number) => arr.reduce((s, x) => s + fn(x), 0);
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const fmt = (n: number) => n.toLocaleString("en-IN");
