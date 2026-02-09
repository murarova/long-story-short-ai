import { motion } from "framer-motion";
import { Check, FileVideo, FileAudio, Link } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ResultsPanelProps {
  fileName: string;
  isUrl: boolean;
}

export const ResultsPanel = ({ fileName, isUrl }: ResultsPanelProps) => {
  const { t } = useLanguage();
  const FileIcon = isUrl
    ? Link
    : fileName.match(/\.(mp3|wav|m4a)$/i)
      ? FileAudio
      : FileVideo;

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
            <h3 className="font-semibold text-foreground truncate">
              {fileName}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-green-500" />
                <span>{t("results.ready")}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
