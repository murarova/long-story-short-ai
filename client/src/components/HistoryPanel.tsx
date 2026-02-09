import { FileText, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLanguage } from "@/contexts/LanguageContext";
import type { HistoryItem } from "@/utils/historyStorage";

export type HistoryPanelVariant = "sidebar" | "inline";

export function HistoryPanel(props: {
  variant: HistoryPanelVariant;
  history: HistoryItem[];
  currentIngestionId: string | null;
  onClear: () => void;
  onDownloadTranscript: (ingestionId: string) => void;
  onDownloadSummary: (ingestionId: string) => void;
  onOpenChatFor: (item: HistoryItem) => void;
}) {
  const { t } = useLanguage();
  const {
    variant,
    history,
    currentIngestionId,
    onClear,
    onDownloadTranscript,
    onDownloadSummary,
    onOpenChatFor,
  } = props;

  const title = t("history.title");
  const subtitle = t("history.subtitle");
  const clear = t("history.clear");
  const empty = t("history.empty");
  const current = t("history.current");

  const downloadTranscript = t("results.downloadTranscript");
  const downloadSummary = t("results.downloadSummary");
  const askQuestions = t("results.askQuestions");

  return (
    <aside
      className={`rounded-2xl border border-border bg-card shadow-soft ${
        variant === "sidebar" ? "h-full flex flex-col" : ""
      }`}
    >
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground mt-0.5 truncate">
            {subtitle}
          </div>
        </div>
        {history.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            {clear}
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="p-5 text-sm text-muted-foreground">{empty}</div>
      ) : (
        <TooltipProvider>
          <div
            className="divide-y divide-border max-h-[500px] overflow-auto"
          >
            {history.map((item) => (
              <div
                key={item.ingestionId}
                className={`grid grid-cols-2 gap-3 p-4 hover:bg-muted/30 transition-colors ${
                  item.ingestionId === currentIngestionId
                    ? "bg-accent-soft/50"
                    : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {item.fileName}
                    </div>
                    {item.ingestionId === currentIngestionId && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                        {current}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(item.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 justify-end">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={downloadTranscript}
                        onClick={() => onDownloadTranscript(item.ingestionId)}
                        className="h-9 w-9"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{downloadTranscript}</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={downloadSummary}
                        onClick={() => onDownloadSummary(item.ingestionId)}
                        className="h-9 w-9"
                      >
                        <Sparkles className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{downloadSummary}</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={askQuestions}
                        onClick={() => onOpenChatFor(item)}
                        className="h-9 w-9"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{askQuestions}</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        </TooltipProvider>
      )}
    </aside>
  );
}
