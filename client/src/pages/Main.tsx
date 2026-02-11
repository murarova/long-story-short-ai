import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { UploadZone } from "@/components/UploadZone";
import { ProcessingState } from "@/components/ProcessingState";
import { ResultsPanel } from "@/components/ResultsPanel";
import { ChatInterface } from "@/components/ChatInterface";
import { HistoryPanel } from "@/components/HistoryPanel";
import { AnimatedStage } from "@/components/AnimatedStage";
import { PreviewPanel } from "@/components/PreviewPanel";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMainController } from "@/hooks/useMainController";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const fadeScale = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

const Main = () => {
  const { t, tList } = useLanguage();
  const {
    appState,
    fileName,
    isUrl,
    ingestionId,
    history,
    isCenteredStage,
    previewTab,
    previewLoading,
    previewContent,
    summaryEvaluation,
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
  } = useMainController();

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
      <main className="pt-16 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[minmax(0,1fr)_380px] gap-6 py-6">
          <div
            className={`min-w-0 ${
              isCenteredStage ? "flex items-center justify-center" : ""
            }`}
          >
            <div className="w-full pr-1">
              <AnimatePresence mode="wait">
                {appState === "upload" && (
                  <AnimatedStage
                    motionKey="upload"
                    variants={fadeUp}
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
                    <div className="space-y-6">
                      <div className="w-full max-w-3xl mx-auto">
                        <UploadZone
                          onFileSelect={handleFileSelect}
                          isProcessing={false}
                        />
                      </div>

                      <div className="lg:hidden">
                        <HistoryPanel
                          variant="inline"
                          history={history}
                          currentIngestionId={ingestionId}
                          onClear={clearHistory}
                          onDownloadTranscript={(id) =>
                            void handleDownloadTranscript(id)
                          }
                          onDownloadSummary={(id) =>
                            void handleDownloadSummary(id)
                          }
                          onOpenChatFor={handleOpenChatFor}
                        />
                      </div>
                    </div>
                  </AnimatedStage>
                )}

                {appState === "processing" && (
                  <AnimatedStage
                    motionKey="processing"
                    variants={fadeScale}
                    className="w-full"
                  >
                    <ProcessingState fileName={fileName} onCancel={handleCancel} />
                  </AnimatedStage>
                )}

                {appState === "results" && (
                  <AnimatedStage
                    motionKey="results"
                    variants={fadeUp}
                    className="w-full"
                  >
                    <div className="space-y-6">
                      <ResultsPanel fileName={fileName} isUrl={isUrl} />

                      <PreviewPanel
                        tab={previewTab}
                        onTabChange={setPreviewTab}
                        content={previewContent}
                        summaryEvaluation={summaryEvaluation}
                        chat={
                          <ChatInterface
                            embedded
                            fileName={fileName}
                            ingestionId={ingestionId || ""}
                          />
                        }
                        isLoading={previewLoading}
                        onDownload={downloadPreview}
                        canDownload={Boolean(previewContent.trim())}
                        labels={{
                          transcript: t("preview.transcript"),
                          summary: t("preview.summary"),
                          chat: t("results.askQuestions"),
                          download: t("preview.download"),
                          loading: t("preview.loading"),
                          empty: t("preview.empty"),
                        }}
                      />

                      <div className="lg:hidden">
                        <HistoryPanel
                          variant="inline"
                          history={history}
                          currentIngestionId={ingestionId}
                          onClear={clearHistory}
                          onDownloadTranscript={(id) =>
                            void handleDownloadTranscript(id)
                          }
                          onDownloadSummary={(id) =>
                            void handleDownloadSummary(id)
                          }
                          onOpenChatFor={handleOpenChatFor}
                        />
                      </div>
                    </div>
                  </AnimatedStage>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="hidden lg:block">
            <HistoryPanel
              variant="sidebar"
              history={history}
              currentIngestionId={ingestionId}
              onClear={clearHistory}
              onDownloadTranscript={(id) => void handleDownloadTranscript(id)}
              onDownloadSummary={(id) => void handleDownloadSummary(id)}
              onOpenChatFor={handleOpenChatFor}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Main;
