import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";
import {
  askIngestion,
  getTranscriptText,
  type EvaluationScores,
} from "@/lib/ragApi";
import { downloadTextFile } from "@/lib/download";
import { SUMMARY_PROMPT } from "@/utils/prompts";

export type PreviewTab = "transcript" | "summary" | "chat";

const errorMessage = (e: unknown): string =>
  e instanceof Error ? e.message : "Unexpected error";

export function usePreview(ingestionId: string | null, ready: boolean) {
  const [previewTab, setPreviewTab] = useState<PreviewTab>("transcript");
  const [transcriptCache, setTranscriptCache] = useState<
    Record<string, string>
  >({});
  const [summaryCache, setSummaryCache] = useState<Record<string, string>>({});
  const [summaryEvalCache, setSummaryEvalCache] = useState<
    Record<string, EvaluationScores | undefined>
  >({});
  const [previewLoading, setPreviewLoading] = useState(false);

  const transcriptCacheRef = useRef(transcriptCache);
  transcriptCacheRef.current = transcriptCache;

  const summaryCacheRef = useRef(summaryCache);
  summaryCacheRef.current = summaryCache;

  const summaryEvalCacheRef = useRef(summaryEvalCache);
  summaryEvalCacheRef.current = summaryEvalCache;

  const ensureTranscriptLoaded = useCallback(async (id: string) => {
    if (transcriptCacheRef.current[id]) return;
    setPreviewLoading(true);
    try {
      const text = await getTranscriptText(id);
      setTranscriptCache((prev) => ({ ...prev, [id]: text }));
    } catch (e: unknown) {
      toast({
        title: "Failed to load transcript",
        description: errorMessage(e),
      });
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const ensureSummaryLoaded = useCallback(async (id: string) => {
    if (summaryCacheRef.current[id]) return;
    setPreviewLoading(true);
    try {
      const out = await askIngestion({
        ingestionId: id,
        question: SUMMARY_PROMPT,
      });
      setSummaryCache((prev) => ({ ...prev, [id]: out.answer }));
      setSummaryEvalCache((prev) => ({ ...prev, [id]: out.evaluation }));
    } catch (e: unknown) {
      toast({
        title: "Failed to load summary",
        description: errorMessage(e),
      });
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ingestionId || !ready) return;
    if (previewTab === "transcript") void ensureTranscriptLoaded(ingestionId);
    if (previewTab === "summary") void ensureSummaryLoaded(ingestionId);
  }, [ingestionId, ready, previewTab, ensureTranscriptLoaded, ensureSummaryLoaded]);

  const previewContent =
    ingestionId && previewTab === "transcript"
      ? (transcriptCache[ingestionId] ?? "")
      : ingestionId && previewTab === "summary"
        ? (summaryCache[ingestionId] ?? "")
        : "";

  const summaryEvaluation =
    ingestionId && previewTab === "summary"
      ? summaryEvalCache[ingestionId]
      : undefined;

  const downloadPreview = useCallback(() => {
    if (!ingestionId) return;
    if (previewTab === "chat") return;
    const text =
      previewTab === "transcript"
        ? (transcriptCache[ingestionId] ?? "")
        : (summaryCache[ingestionId] ?? "");
    if (!text.trim()) return;
    downloadTextFile(
      previewTab === "transcript" ? "transcript.txt" : "summary.txt",
      text,
    );
  }, [ingestionId, previewTab, transcriptCache, summaryCache]);

  const handleDownloadTranscript = useCallback(
    async (targetIngestionId?: unknown) => {
      const id =
        typeof targetIngestionId === "string" ? targetIngestionId : ingestionId;
      if (!id) {
        toast({
          title: "Not ready",
          description: "No transcript is available yet.",
        });
        return;
      }
      try {
        const text = await getTranscriptText(id);
        downloadTextFile("transcript.txt", text);
      } catch (e: unknown) {
        toast({ title: "Download failed", description: errorMessage(e) });
      }
    },
    [ingestionId],
  );

  const handleDownloadSummary = useCallback(
    async (targetIngestionId?: unknown) => {
      const id =
        typeof targetIngestionId === "string" ? targetIngestionId : ingestionId;
      if (!id) {
        toast({
          title: "Not ready",
          description: "No summary is available yet.",
        });
        return;
      }
      try {
        const out = await askIngestion({
          ingestionId: id,
          question: SUMMARY_PROMPT,
        });
        downloadTextFile("summary.txt", out.answer);
      } catch (e: unknown) {
        toast({ title: "Summary failed", description: errorMessage(e) });
      }
    },
    [ingestionId],
  );

  const resetPreviewTab = useCallback(() => {
    setPreviewTab("transcript");
  }, []);

  return {
    previewTab,
    setPreviewTab,
    previewLoading,
    previewContent,
    summaryEvaluation,
    downloadPreview,
    handleDownloadTranscript,
    handleDownloadSummary,
    resetPreviewTab,
  };
}
