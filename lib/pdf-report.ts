/**
 * PDF Report Generator for WealthAI
 * Uses jspdf + jspdf-autotable — runs 100% in browser, no server call.
 */

import type { Transaction } from "./supabase";
import type { AIContext }   from "./financial-analysis";
import { CATEGORIES }       from "./supabase";
import { format }           from "date-fns";

// Lazy-load jspdf to avoid SSR issues in Next.js
async function getJsPDF() {
  const { jsPDF } = await import("jspdf");
  await import("jspdf-autotable");
  return jsPDF;
}

// ── colour helpers ──────────────────────────────────────────────────────────
const GREEN  = [29,  158, 117] as [number,number,number];
const RED    = [226,  75,  74] as [number,number,number];
const DARK   = [26,   26,  26] as [number,number,number];
const GREY   = [120, 120, 120] as [number,number,number];
const LGREY  = [245, 245, 245] as [number,number,number];

// ── main export ─────────────────────────────────────────────────────────────

export async function generateExpenseReport(
  txns: Transaction[],
  ctx: AIContext,
  monthLabel: string
): Promise<void> {
  const jsPDF = await getJsPDF();
  const doc   = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const W     = doc.internal.pageSize.getWidth();
  const H     = doc.internal.pageSize.getWidth();
  let   y     = 0;

  // ── 1. Header banner ──────────────────────────────────────────────────────
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, W, 38, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("💰 WealthAI", 14, 15);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Monthly Expense Report — ${monthLabel}`, 14, 23);

  doc.setFontSize(9);
  doc.setTextColor(200, 240, 225);
  doc.text(`Generated: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`, 14, 30);
  doc.text(`Health Score: ${ctx.healthScore.score}/100 (${ctx.healthScore.grade})`, W - 14, 30, { align: "right" });

  y = 46;

  // ── 2. Summary cards row ──────────────────────────────────────────────────
  const cards = [
    { label: "Total Income",   val: `Rs ${ctx.income.toLocaleString("en-IN")}`,   color: GREEN },
    { label: "Total Expenses", val: `Rs ${ctx.expenses.toLocaleString("en-IN")}`, color: RED   },
    { label: "Net Savings",    val: `Rs ${ctx.savings.toLocaleString("en-IN")}`,  color: ctx.savings >= 0 ? GREEN : RED },
    { label: "Savings Rate",   val: `${ctx.savingsRate.toFixed(1)}%`,             color: ctx.savingsRate >= 20 ? GREEN : RED },
  ];
  const cardW = (W - 28 - 9) / 4;
  cards.forEach((card, i) => {
    const x = 14 + i * (cardW + 3);
    doc.setFillColor(...LGREY);
    doc.roundedRect(x, y, cardW, 22, 2, 2, "F");
    doc.setFontSize(7);
    doc.setTextColor(...GREY);
    doc.setFont("helvetica", "normal");
    doc.text(card.label, x + cardW / 2, y + 7, { align: "center" });
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...card.color);
    doc.text(card.val, x + cardW / 2, y + 16, { align: "center" });
  });
  y += 30;

  // ── 3. Annual goal bar ────────────────────────────────────────────────────
  if (ctx.annualGoal > 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(`Annual Goal Progress: ${ctx.goalProgress}%  (Rs ${ctx.predictedYearEnd.toLocaleString("en-IN")} predicted / Rs ${ctx.annualGoal.toLocaleString("en-IN")} goal)`, 14, y);
    y += 4;
    const barW = W - 28;
    doc.setFillColor(...LGREY);
    doc.roundedRect(14, y, barW, 5, 2, 2, "F");
    const fill = Math.min(ctx.goalProgress / 100, 1) * barW;
    doc.setFillColor(...(ctx.goalOnTrack ? GREEN : RED));
    doc.roundedRect(14, y, fill, 5, 2, 2, "F");
    y += 12;
  }

  // ── 4. Category breakdown table ───────────────────────────────────────────
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("Spending by Category", 14, y);
  y += 4;

  const catRows = ctx.categoryBreakdown.map(c => [
    `${c.emoji} ${c.label}`,
    `Rs ${c.amount.toLocaleString("en-IN")}`,
    `${c.pct}%`,
    c.budget ? `Rs ${c.budget.toLocaleString("en-IN")}` : "—",
    c.overBudget ? "⚠ Over!" : "✓ OK",
  ]);

  (doc as any).autoTable({
    startY: y,
    head: [["Category", "Spent", "% of Total", "Budget", "Status"]],
    body: catRows,
    theme: "grid",
    headStyles: { fillColor: GREEN, textColor: 255, fontSize: 9, fontStyle: "bold" },
    bodyStyles: { fontSize: 9, textColor: DARK },
    alternateRowStyles: { fillColor: LGREY },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 32, halign: "right" },
      2: { cellWidth: 22, halign: "right" },
      3: { cellWidth: 32, halign: "right" },
      4: { cellWidth: 22, halign: "center" },
    },
    margin: { left: 14, right: 14 },
    didParseCell: (data: any) => {
      if (data.column.index === 4 && data.section === "body") {
        data.cell.styles.textColor = data.cell.raw.includes("⚠") ? RED : GREEN;
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ── 5. Full transaction list ──────────────────────────────────────────────
  // new page if not enough room
  if (y > 220) { doc.addPage(); y = 20; }

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("All Transactions", 14, y);
  y += 4;

  const txnRows = txns.map(t => {
    const cat = CATEGORIES[t.category as keyof typeof CATEGORIES];
    return [
      format(new Date(t.date), "dd MMM"),
      t.title.slice(0, 36),
      `${cat?.emoji || ""} ${cat?.label || t.category}`,
      t.type === "income" ? `+Rs ${t.amount.toLocaleString("en-IN")}` : `-Rs ${t.amount.toLocaleString("en-IN")}`,
      t.note?.slice(0, 28) || "",
      t.receipt_url ? "📎 Yes" : "",
    ];
  });

  (doc as any).autoTable({
    startY: y,
    head: [["Date", "Description", "Category", "Amount", "Note", "Receipt"]],
    body: txnRows,
    theme: "striped",
    headStyles: { fillColor: [50, 50, 50], textColor: 255, fontSize: 8, fontStyle: "bold" },
    bodyStyles: { fontSize: 8, textColor: DARK },
    alternateRowStyles: { fillColor: LGREY },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 55 },
      2: { cellWidth: 36 },
      3: { cellWidth: 32, halign: "right" },
      4: { cellWidth: 30 },
      5: { cellWidth: 14, halign: "center" },
    },
    margin: { left: 14, right: 14 },
    didParseCell: (data: any) => {
      if (data.column.index === 3 && data.section === "body") {
        data.cell.styles.textColor = data.cell.raw?.startsWith("+") ? GREEN : RED;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  // ── 6. Footer on every page ───────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const pH = doc.internal.pageSize.getHeight();
    doc.setFillColor(...LGREY);
    doc.rect(0, pH - 12, W, 12, "F");
    doc.setFontSize(7);
    doc.setTextColor(...GREY);
    doc.setFont("helvetica", "normal");
    doc.text("WealthAI — Personal Finance Tracker", 14, pH - 5);
    doc.text(`Page ${p} of ${pageCount}`, W - 14, pH - 5, { align: "right" });
    doc.text("⚠ This report is for personal reference only, not financial advice.", W / 2, pH - 5, { align: "center" });
  }

  // ── 7. Save ───────────────────────────────────────────────────────────────
  doc.save(`WealthAI_Report_${monthLabel.replace(" ", "_")}.pdf`);
}
