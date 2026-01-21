import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { UploadZone } from "@/components/UploadZone";
import { ProcessingState } from "@/components/ProcessingState";
import { ResultsPanel } from "@/components/ResultsPanel";
import { ChatInterface } from "@/components/ChatInterface";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { createIngestion, getTranscriptText } from "@/lib/ragApi";
import { downloadTextFile } from "@/lib/download";
import { useIngestionPolling } from "@/hooks/useIngestionPolling";

type AppState = "upload" | "processing" | "results" | "chat";

const Index = () => {
  const [appState, setAppState] = useState<AppState>("upload");
  const [fileName, setFileName] = useState("");
  const [isUrl, setIsUrl] = useState(false);
  const [ingestionId, setIngestionId] = useState<string | null>(null);
  const { t, tList } = useLanguage();

  const errorMessage = (e: unknown): string =>
    e instanceof Error ? e.message : "Unexpected error";

  const handleFileSelect = useCallback(
    async (file: File | null, url: string | null) => {
      if (url) {
        toast({
          title: "Not supported yet",
          description:
            "Link ingestion will be added next. Please upload an audio file for now.",
        });
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
    []
  );

  const { status: ingestionStatus, error: pollError } = useIngestionPolling(
    ingestionId,
    appState === "processing"
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
  }, [appState, ingestionId, ingestionStatus, pollError]);

  const handleDownloadTranscript = async () => {
    if (!ingestionId) {
      toast({
        title: "Not ready",
        description: "No transcript is available yet.",
      });
      return;
    }

    try {
      const text = await getTranscriptText(ingestionId);
      const downloadName = "transcript.txt";
      downloadTextFile(downloadName, text);
    } catch (e: unknown) {
      toast({
        title: "Download failed",
        description: errorMessage(e),
      });
    }
  };

  const handleDownloadSummary = () => {
    toast({
      title: t("toast.generatingSummary"),
      description: t("toast.generatingSummaryDesc"),
    });
  };

  const handleOpenChat = () => {
    setAppState("chat");
  };

  const handleBackFromChat = () => {
    setAppState("results");
  };

  const handleReset = () => {
    setAppState("upload");
    setFileName("");
    setIsUrl(false);
    setIngestionId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={handleReset} className="focus:outline-none">
            <Logo />
          </button>
          <div className="flex items-center gap-4">
            {appState !== "upload" && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={handleReset}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("header.newAnalysis")}
              </motion.button>
            )}
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 min-h-screen flex items-center justify-center px-6 py-12">
        <AnimatePresence mode="wait">
          {appState === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <div className="text-center mb-12">
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl sm:text-5xl font-bold text-foreground mb-6 tracking-tight"
                >
                  {t("app.title")}
                </motion.h1>
                <div className="text-lg text-muted-foreground max-w-lg mx-auto text-center list-disc list-inside space-y-1">
                  {tList("app.subtitle").map((item, idx) => (
                    <p key={`${idx}-${item}`}>{item}</p>
                  ))}
                </div>
              </div>
              <UploadZone
                onFileSelect={handleFileSelect}
                isProcessing={false}
              />
            </motion.div>
          )}

          {appState === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <ProcessingState fileName={fileName} />
            </motion.div>
          )}

          {appState === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <ResultsPanel
                fileName={fileName}
                isUrl={isUrl}
                onDownloadTranscript={handleDownloadTranscript}
                onDownloadSummary={handleDownloadSummary}
                onOpenChat={handleOpenChat}
              />
            </motion.div>
          )}

          {appState === "chat" && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <ChatInterface
                fileName={fileName}
                ingestionId={ingestionId || ""}
                onBack={handleBackFromChat}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Index;
