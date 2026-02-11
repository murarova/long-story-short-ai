import { useCallback, useEffect, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import { useHistory } from "@/hooks/useHistory";
import { usePreview } from "@/hooks/usePreview";
import { useIngestion } from "@/hooks/useIngestion";
import type { HistoryItem } from "@/utils/historyStorage";

export type { AppState } from "@/hooks/useIngestion";
export type { PreviewTab } from "@/hooks/usePreview";

export function useMainController() {
  const { history, clearHistory, upsertHistory } = useHistory();

  const {
    appState,
    fileName,
    isUrl,
    ingestionId,
    polling,
    handleFileSelect,
    handleCancel,
    handleReset: ingestionReset,
    openChatFor,
    transitionToResults,
    transitionToUpload,
  } = useIngestion();

  const {
    previewTab,
    setPreviewTab,
    previewLoading,
    previewContent,
    summaryEvaluation,
    downloadPreview,
    handleDownloadTranscript,
    handleDownloadSummary,
    resetPreviewTab,
  } = usePreview(ingestionId, appState === "results");

  useEffect(() => {
    if (appState !== "processing" || !ingestionId) return;

    if (polling.error) {
      toast({
        title: "Connection error",
        description: polling.error || "Could not reach API server.",
      });
      transitionToUpload();
      return;
    }

    if (!polling.status) return;

    if (polling.status.status === "ready") {
      transitionToResults();
      resetPreviewTab();
      upsertHistory({
        ingestionId,
        fileName: fileName || "audio",
        isUrl,
        createdAt: Date.now(),
      });
      return;
    }

    if (polling.status.status === "error") {
      toast({
        title: "Processing failed",
        description: polling.status.error || "Unknown error.",
      });
      transitionToUpload();
    }
  }, [
    appState,
    ingestionId,
    polling.status,
    polling.error,
    fileName,
    isUrl,
    upsertHistory,
    transitionToResults,
    transitionToUpload,
    resetPreviewTab,
  ]);

  const handleOpenChat = useCallback(() => {
    if (!ingestionId) {
      toast({
        title: "Not ready",
        description: "Upload and process an audio file first.",
      });
      return;
    }
    setPreviewTab("chat");
  }, [ingestionId, setPreviewTab]);

  const handleOpenChatFor = useCallback(
    (item: HistoryItem) => {
      if (!item.ingestionId) {
        toast({
          title: "Not ready",
          description: "This history item is missing an ingestion id.",
        });
        return;
      }
      openChatFor(item.ingestionId, item.fileName, item.isUrl);
      setPreviewTab("chat");
    },
    [openChatFor, setPreviewTab],
  );

  const handleReset = useCallback(() => {
    ingestionReset();
    resetPreviewTab();
  }, [ingestionReset, resetPreviewTab]);

  const isCenteredStage = useMemo(
    () =>
      (appState === "upload" || appState === "processing") &&
      history.length === 0,
    [appState, history.length],
  );

  return {
    appState,
    fileName,
    isUrl,
    ingestionId,
    history,
    isCenteredStage,
    previewTab,
    previewLoading,
    previewContent,

    clearHistory,
    handleFileSelect,
    handleDownloadTranscript,
    handleDownloadSummary,
    handleOpenChat,
    handleOpenChatFor,
    handleCancel,
    handleReset,
    setPreviewTab,
    downloadPreview,
    summaryEvaluation,
  };
}
