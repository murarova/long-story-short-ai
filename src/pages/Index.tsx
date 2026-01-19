import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { UploadZone } from "@/components/UploadZone";
import { ProcessingState } from "@/components/ProcessingState";
import { ResultsPanel } from "@/components/ResultsPanel";
import { ChatInterface } from "@/components/ChatInterface";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

type AppState = "upload" | "processing" | "results" | "chat";

const Index = () => {
  const [appState, setAppState] = useState<AppState>("upload");
  const [fileName, setFileName] = useState("");
  const [isUrl, setIsUrl] = useState(false);
  const { t } = useLanguage();

  const handleFileSelect = useCallback((file: File | null, url: string | null) => {
    if (file) {
      setFileName(file.name);
      setIsUrl(false);
    } else if (url) {
      // Extract domain or video ID for display
      try {
        const urlObj = new URL(url);
        setFileName(urlObj.hostname + urlObj.pathname.slice(0, 30));
      } catch {
        setFileName(url.slice(0, 50));
      }
      setIsUrl(true);
    }

    setAppState("processing");

    // Simulate processing time
    setTimeout(() => {
      setAppState("results");
    }, 6000);
  }, []);

  const handleDownloadTranscript = () => {
    toast({
      title: t("toast.downloadingTranscript"),
      description: t("toast.downloadingTranscriptDesc"),
    });
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
                  className="text-4xl sm:text-5xl font-bold text-foreground mb-4 tracking-tight"
                >
                  {t("app.title")}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-lg text-muted-foreground max-w-lg mx-auto"
                >
                  {t("app.subtitle")}
                </motion.p>
              </div>
              <UploadZone onFileSelect={handleFileSelect} isProcessing={false} />
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
              <ChatInterface fileName={fileName} onBack={handleBackFromChat} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Index;
