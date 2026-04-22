import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { MetricsTableRow } from "@/lib/types/database";

export async function captureElement(
  element: HTMLElement,
  pixelRatio: number = 2
): Promise<string> {
  return toPng(element, {
    pixelRatio,
    backgroundColor: "#ffffff",
    filter: (node) => {
      // Skip elements marked with data-pdf-ignore
      if (node instanceof HTMLElement && node.dataset.pdfIgnore === "true") {
        return false;
      }
      return true;
    },
  });
}

interface ReportParams {
  chartRef: HTMLElement | null;
  metrics: MetricsTableRow[];
  clientName: string;
  date: string;
  healthScore?: number | null;
  pacingScore?: number | null;
  cpaScore?: number | null;
  convQualityScore?: number | null;
}

export async function generateClientReport({
  chartRef,
  metrics,
  clientName,
  date,
  healthScore,
  pacingScore,
  cpaScore,
  convQualityScore,
}: ReportParams): Promise<jsPDF> {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Header
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(37, 99, 235); // Blue-600
  doc.text("AD LAB", margin, y + 8);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128); // Gray-500
  doc.text("Performance Health Report", margin + 35, y + 8);

  y += 16;

  // Client name and date
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39); // Gray-900
  doc.text(clientName, margin, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.text(`Report Date: ${date}`, margin, y);
  y += 10;

  // Separator line
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // KPI Summary Strip
  const kpiBoxWidth = contentWidth / 4;
  const kpiBoxHeight = 18;
  const kpis = [
    { label: "Health Score", value: healthScore != null ? Math.round(healthScore).toString() : "--" },
    { label: "Pacing", value: pacingScore != null ? Math.round(pacingScore).toString() : "--" },
    { label: "CPA Score", value: cpaScore != null ? Math.round(cpaScore).toString() : "--" },
    { label: "Conv Quality", value: convQualityScore != null ? Math.round(convQualityScore).toString() : "--" },
  ];

  kpis.forEach((kpi, i) => {
    const x = margin + i * kpiBoxWidth;
    const score = parseFloat(kpi.value);

    // Background color based on score
    if (!isNaN(score)) {
      if (score >= 80) {
        doc.setFillColor(236, 253, 245); // Emerald-50
      } else if (score >= 40) {
        doc.setFillColor(255, 251, 235); // Amber-50
      } else {
        doc.setFillColor(254, 242, 242); // Red-50
      }
    } else {
      doc.setFillColor(249, 250, 251); // Gray-50
    }

    doc.roundedRect(x + 1, y, kpiBoxWidth - 2, kpiBoxHeight, 2, 2, "F");

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text(kpi.label, x + kpiBoxWidth / 2, y + 6, { align: "center" });

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    if (!isNaN(score)) {
      if (score >= 80) doc.setTextColor(5, 150, 105); // Emerald-600
      else if (score >= 40) doc.setTextColor(217, 119, 6); // Amber-600
      else doc.setTextColor(220, 38, 38); // Red-600
    } else {
      doc.setTextColor(156, 163, 175);
    }
    doc.text(kpi.value, x + kpiBoxWidth / 2, y + 14, { align: "center" });
  });

  y += kpiBoxHeight + 10;

  // Chart image capture
  if (chartRef) {
    try {
      const chartPng = await captureElement(chartRef);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = chartPng;
      });

      const imgWidth = contentWidth;
      const imgHeight = (img.height / img.width) * imgWidth;

      // Check if chart fits on current page
      if (y + imgHeight > doc.internal.pageSize.getHeight() - 30) {
        doc.addPage();
        y = margin;
      }

      doc.addImage(chartPng, "PNG", margin, y, imgWidth, imgHeight);
      y += imgHeight + 10;
    } catch (err) {
      console.warn("Failed to capture chart:", err);
    }
  }

  // Metrics table
  if (metrics.length > 0) {
    if (y > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      y = margin;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text("Daily Metrics (Last 14 Days)", margin, y);
    y += 6;

    const tableHeaders = [
      "Date",
      "Spend",
      "Clicks",
      "Conv.",
      "Revenue",
      "ROAS",
      "CPA",
      "Score",
    ];

    const formatVal = (v: number | null, prefix = "", suffix = "") => {
      if (v === null || v === undefined) return "--";
      return `${prefix}${Number(v).toLocaleString("en-US", { maximumFractionDigits: 2 })}${suffix}`;
    };

    const tableData = metrics.map((m) => [
      m.date,
      formatVal(m.cost, "$"),
      formatVal(m.clicks),
      formatVal(m.conversions),
      formatVal(m.conversion_value, "$"),
      m.roas != null ? `${Number(m.roas).toFixed(2)}x` : "--",
      formatVal(m.cpa, "$"),
      m.weighted_total != null ? Math.round(m.weighted_total).toString() : "--",
    ]);

    autoTable(doc, {
      startY: y,
      head: [tableHeaders],
      body: tableData,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 7,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7,
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      didParseCell: (data) => {
        // Color-code health score column
        if (data.section === "body" && data.column.index === 7) {
          const score = parseFloat(data.cell.text[0]);
          if (!isNaN(score)) {
            if (score >= 80) {
              data.cell.styles.textColor = [5, 150, 105];
              data.cell.styles.fontStyle = "bold";
            } else if (score >= 40) {
              data.cell.styles.textColor = [217, 119, 6];
              data.cell.styles.fontStyle = "bold";
            } else {
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fontStyle = "bold";
            }
          }
        }
      },
    });
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(156, 163, 175);
    doc.text(
      `Ad Lab Performance Report | ${clientName} | Generated ${new Date().toLocaleDateString()}`,
      margin,
      pageHeight - 8
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: "right" }
    );
  }

  return doc;
}
