import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";
import {
  askIngestion,
  createIngestion,
  createIngestionFromUrl,
  getTranscriptText,
} from "@/lib/ragApi";
import { downloadTextFile } from "@/lib/download";
import { useIngestionPolling } from "@/hooks/useIngestionPolling";
import { SUMMARY_PROMPT } from "@/utils/prompts";
import {
  clearHistoryStorage,
  loadHistoryFromStorage,
  saveHistoryToStorage,
  type HistoryItem,
  upsertHistoryItem,
  HISTORY_STORAGE_KEY,
} from "@/utils/historyStorage";

export type AppState = "upload" | "processing" | "results";
export type PreviewTab = "transcript" | "summary" | "chat";

const errorMessage = (e: unknown): string =>
  e instanceof Error ? e.message : "Unexpected error";

export function useMainController() {
  const [appState, setAppState] = useState<AppState>("upload");
  const [fileName, setFileName] = useState("");
  const [isUrl, setIsUrl] = useState(false);
  const [ingestionId, setIngestionId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(() =>
    loadHistoryFromStorage(),
  );

  // Preview state (cached per ingestion id in-memory)
  const [previewTab, setPreviewTab] = useState<PreviewTab>("transcript");
  const [transcriptCache, setTranscriptCache] = useState<
    Record<string, string>
  >({});
  const [summaryCache, setSummaryCache] = useState<Record<string, string>>({});
  const [previewLoading, setPreviewLoading] = useState(false);

  const refreshHistory = useCallback(() => {
    setHistory(loadHistoryFromStorage());
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    clearHistoryStorage();
  }, []);

  const upsertHistory = useCallback((item: HistoryItem) => {
    setHistory((prev) => {
      const next = upsertHistoryItem(prev, item);
      saveHistoryToStorage(next);
      return next;
    });
  }, []);

  // Refresh history on initial load and when it changes in another tab.
  useEffect(() => {
    refreshHistory();
    const onStorage = (e: StorageEvent) => {
      if (e.key === HISTORY_STORAGE_KEY) refreshHistory();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refreshHistory]);

  const handleFileSelect = useCallback(
    async (file: File | null, url: string | null) => {
      if (url) {
        setFileName(url);
        setIsUrl(true);
        setAppState("processing");

        try {
          const created = await createIngestionFromUrl({ url });
          setIngestionId(created.ingestionId);
        } catch (e: unknown) {
          toast({
            title: "Upload failed",
            description: errorMessage(e) || "Could not start ingestion.",
          });
          setAppState("upload");
        }
        return;
      }
      if (!file) return;

      setFileName(file.name);
      setIsUrl(false);
      setAppState("processing");

      try {
        const created = await createIngestion({ audio: file });
        setIngestionId(created.ingestionId);
      } catch (e: unknown) {
        toast({
          title: "Upload failed",
          description: errorMessage(e) || "Could not start ingestion.",
        });
        setAppState("upload");
      }
    },
    [],
  );

  const { status: ingestionStatus, error: pollError } = useIngestionPolling(
    ingestionId,
    appState === "processing",
  );

  useEffect(() => {
    if (appState !== "processing" || !ingestionId) return;

    if (pollError) {
      toast({
        title: "Connection error",
        description: pollError || "Could not reach API server.",
      });
      setAppState("upload");
      setIngestionId(null);
      return;
    }

    if (!ingestionStatus) return;

    if (ingestionStatus.status === "ready") {
      setAppState("results");
      setPreviewTab("transcript");
      upsertHistory({
        ingestionId,
        fileName: fileName || "audio",
        isUrl,
        createdAt: Date.now(),
      });
      return;
    }

    if (ingestionStatus.status === "error") {
      toast({
        title: "Processing failed",
        description: ingestionStatus.error || "Unknown error.",
      });
      setAppState("upload");
      setIngestionId(null);
    }
  }, [
    appState,
    ingestionId,
    ingestionStatus,
    pollError,
    fileName,
    isUrl,
    upsertHistory,
  ]);

  const ensureTranscriptLoaded = useCallback(
    async (id: string) => {
      if (transcriptCache[id]) return;
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
    },
    [transcriptCache],
  );

  const ensureSummaryLoaded = useCallback(
    async (id: string) => {
      if (summaryCache[id]) return;
      setPreviewLoading(true);
      try {
        const out = await askIngestion({
          ingestionId: id,
          question: SUMMARY_PROMPT,
        });
        setSummaryCache((prev) => ({ ...prev, [id]: out.answer }));
      } catch (e: unknown) {
        toast({
          title: "Failed to load summary",
          description: errorMessage(e),
        });
      } finally {
        setPreviewLoading(false);
      }
    },
    [summaryCache],
  );

  // Auto-load preview content when switching tabs on results screen.
  useEffect(() => {
    if (appState !== "results") return;
    if (!ingestionId) return;
    if (previewTab === "transcript") void ensureTranscriptLoaded(ingestionId);
    if (previewTab === "summary") void ensureSummaryLoaded(ingestionId);
  }, [
    appState,
    ingestionId,
    previewTab,
    ensureTranscriptLoaded,
    ensureSummaryLoaded,
  ]);

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
        toast({
          title: "Download failed",
          description: errorMessage(e),
        });
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
        toast({
          title: "Summary failed",
          description: errorMessage(e),
        });
      }
    },
    [ingestionId],
  );

  const handleOpenChat = useCallback(() => {
    if (!ingestionId) {
      toast({
        title: "Not ready",
        description: "Upload and process an audio file first.",
      });
      return;
    }
    setPreviewTab("chat");
    setAppState("results");
  }, [ingestionId]);

  const handleOpenChatFor = useCallback((item: HistoryItem) => {
    if (!item.ingestionId) {
      toast({
        title: "Not ready",
        description: "This history item is missing an ingestion id.",
      });
      return;
    }
    setFileName(item.fileName);
    setIsUrl(item.isUrl);
    setIngestionId(item.ingestionId);
    setPreviewTab("chat");
    setAppState("results");
  }, []);

  const handleReset = useCallback(() => {
    setAppState("upload");
    setFileName("");
    setIsUrl(false);
    setIngestionId(null);
    setPreviewTab("transcript");
  }, []);

  // Center only when there isn't extra content (like history) to show below.
  const isCenteredStage = useMemo(
    () =>
      (appState === "upload" || appState === "processing") &&
      history.length === 0,
    [appState, history.length],
  );

  return {
    // state
    appState,
    fileName,
    isUrl,
    ingestionId,
    history,
    isCenteredStage,
    previewTab,
    previewLoading,
    previewContent:
      ingestionId && previewTab === "transcript"
        ? (transcriptCache[ingestionId] ?? "")
        : ingestionId && previewTab === "summary"
          ? (summaryCache[ingestionId] ?? "")
          : "",

    // actions
    clearHistory,
    handleFileSelect,
    handleDownloadTranscript,
    handleDownloadSummary,
    handleOpenChat,
    handleOpenChatFor,
    handleReset,
    setPreviewTab,
    downloadPreview: () => {
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
    },
  };
}
