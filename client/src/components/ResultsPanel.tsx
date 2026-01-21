import { motion } from "framer-motion";
import { FileText, Sparkles, MessageCircle, Check, FileVideo, FileAudio, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface ResultsPanelProps {
  fileName: string;
  isUrl: boolean;
  onDownloadTranscript: () => void;
  onDownloadSummary: () => void;
  onOpenChat: () => void;
}

export const ResultsPanel = ({
  fileName,
  isUrl,
  onDownloadTranscript,
  onDownloadSummary,
  onOpenChat,
}: ResultsPanelProps) => {
  const { t } = useLanguage();
  const FileIcon = isUrl ? Link : fileName.match(/\.(mp3|wav|m4a)$/i) ? FileAudio : FileVideo;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-2xl mx-auto"
    >
      {/* File Info Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-2xl p-6 shadow-soft mb-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-accent-soft flex items-center justify-center shrink-0">
            <FileIcon className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{fileName}</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-green-500" />
                <span>{t("results.ready")}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <div className="grid sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            variant="outline"
            onClick={onDownloadTranscript}
            className="w-full h-auto py-4 px-5 flex flex-col items-center gap-2 rounded-xl 
                       border-border hover:border-primary/50 hover:bg-accent-soft 
                       transition-all duration-200 group"
          >
            <FileText className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-sm font-medium">{t("results.downloadTranscript")}</span>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            variant="outline"
            onClick={onDownloadSummary}
            className="w-full h-auto py-4 px-5 flex flex-col items-center gap-2 rounded-xl 
                       border-border hover:border-primary/50 hover:bg-accent-soft 
                       transition-all duration-200 group"
          >
            <Sparkles className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-sm font-medium">{t("results.downloadSummary")}</span>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={onOpenChat}
            className="w-full h-auto py-4 px-5 flex flex-col items-center gap-2 rounded-xl 
                       shadow-accent hover:shadow-lg transition-all duration-200"
          >
            <MessageCircle className="w-6 h-6" />
            <span className="text-sm font-medium">{t("results.askQuestions")}</span>
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
};
