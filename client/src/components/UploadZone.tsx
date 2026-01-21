import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Link, FileAudio, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface UploadZoneProps {
  onFileSelect: (file: File | null, url: string | null) => void;
  isProcessing: boolean;
}

export const UploadZone = ({ onFileSelect, isProcessing }: UploadZoneProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { t } = useLanguage();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setSelectedFile(files[0]);
      setInputValue(files[0].name);
    }
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        setSelectedFile(files[0]);
        setInputValue(files[0].name);
      }
    },
    []
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (selectedFile && e.target.value !== selectedFile.name) {
      setSelectedFile(null);
    }
  };

  const handleAnalyze = () => {
    if (selectedFile) {
      onFileSelect(selectedFile, null);
    } else if (inputValue.trim()) {
      onFileSelect(null, inputValue.trim());
    }
  };

  const clearInput = () => {
    setInputValue("");
    setSelectedFile(null);
  };

  const isValidInput = inputValue.trim().length > 0;
  const isUrl = !selectedFile && inputValue.includes("://");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative rounded-2xl border-2 border-dashed transition-all duration-300 p-8
          ${isDragOver 
            ? 'border-primary bg-accent-soft scale-[1.02]' 
            : 'border-border bg-card hover:border-muted-foreground/30'
          }
          ${isProcessing ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ y: isDragOver ? -4 : 0 }}
              className="w-12 h-12 rounded-xl bg-accent-soft flex items-center justify-center"
            >
              <FileAudio className="w-6 h-6 text-primary" />
            </motion.div>
            <motion.div
              animate={{ y: isDragOver ? -8 : 0 }}
              transition={{ delay: 0.05 }}
              className="w-12 h-12 rounded-xl bg-accent-soft flex items-center justify-center"
            >
              <Upload className="w-6 h-6 text-primary" />
            </motion.div>
            <motion.div
              animate={{ y: isDragOver ? -4 : 0 }}
              transition={{ delay: 0.1 }}
              className="w-12 h-12 rounded-xl bg-accent-soft flex items-center justify-center"
            >
              <FileAudio className="w-6 h-6 text-primary" />
            </motion.div>
          </div>

          <div className="w-full relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              {isUrl ? <Link className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
            </div>
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              placeholder={t("upload.placeholder")}
              className="w-full h-14 pl-12 pr-12 rounded-xl bg-secondary/50 border border-border 
                         text-foreground placeholder:text-muted-foreground
                         focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                         transition-all duration-200"
              disabled={isProcessing}
            />
            <AnimatePresence>
              {inputValue && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={clearInput}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground 
                             hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <input
            type="file"
            id="file-upload"
            accept="audio/*,.mp3,.wav,.m4a"
            onChange={handleFileInput}
            className="hidden"
          />

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{t("upload.or")}</span>
            <label
              htmlFor="file-upload"
              className="text-primary hover:text-primary/80 cursor-pointer font-medium transition-colors"
            >
              {t("upload.browse")}
            </label>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 flex justify-center"
      >
        <Button
          onClick={handleAnalyze}
          disabled={!isValidInput || isProcessing}
          size="lg"
          className="px-12 h-12 text-base font-medium rounded-xl shadow-accent 
                     disabled:shadow-none disabled:opacity-50 transition-all duration-300
                     hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
              />
              {t("upload.analyzing")}
            </span>
          ) : (
            t("upload.analyze")
          )}
        </Button>
      </motion.div>
    </motion.div>
  );
};
