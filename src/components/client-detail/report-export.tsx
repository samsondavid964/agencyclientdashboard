"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { MetricsTableRow } from "@/lib/types/database";

interface ReportExportProps {
  chartRef: React.RefObject<HTMLElement | null>;
  metrics: MetricsTableRow[];
  clientName: string;
  date: string;
  healthScore?: number | null;
  pacingScore?: number | null;
  cpaScore?: number | null;
  convQualityScore?: number | null;
}

export function ReportExport({
  chartRef,
  metrics,
  clientName,
  date,
  healthScore,
  pacingScore,
  cpaScore,
  convQualityScore,
}: ReportExportProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleExport() {
    setIsGenerating(true);

    try {
      const generateReport = async () => {
        // Dynamic import to avoid SSR issues with jsPDF
        const { generateClientReport } = await import("@/lib/utils/pdf-export");

        const doc = await generateClientReport({
          chartRef: chartRef.current,
          metrics,
          clientName,
          date,
          healthScore,
          pacingScore,
          cpaScore,
          convQualityScore,
        });

        const safeClientName = clientName
          .replace(/[^a-zA-Z0-9]/g, "-")
          .toLowerCase();
        doc.save(`${safeClientName}-report-${date}.pdf`);
      };

      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 30000)
      );

      await Promise.race([generateReport(), timeout]);
      toast.success("Report downloaded successfully");
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      const message =
        err instanceof Error && err.message === "timeout"
          ? "Report generation timed out — try again"
          : "Failed to generate report. Please try again.";
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isGenerating}
      className="gap-1.5"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Generating...
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4" />
          Generate Report
        </>
      )}
    </Button>
  );
}
