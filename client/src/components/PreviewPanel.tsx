import { Button } from "@/components/ui/button";
import { Download, FileText, MessageCircle, Sparkles } from "lucide-react";
import type { EvaluationScores } from "@/lib/ragApi";

export type PreviewTab = "transcript" | "summary" | "chat";

export function PreviewPanel(props: {
  tab: PreviewTab;
  onTabChange: (tab: PreviewTab) => void;
  content: string;
  chat: React.ReactNode;
  isLoading: boolean;
  onDownload: () => void;
  canDownload: boolean;
  summaryEvaluation?: EvaluationScores;
  labels: {
    transcript: string;
    summary: string;
    chat: string;
    download: string;
    loading: string;
    empty: string;
  };
}): JSX.Element {
  const {
    tab,
    onTabChange,
    content,
    chat,
    isLoading,
    onDownload,
    canDownload,
    summaryEvaluation,
    labels,
  } = props;

  const tabButtonClass = (active: boolean) =>
    `rounded-xl border-border transition-all duration-200 group ${
      active
        ? "border-primary/50 bg-accent-soft hover:bg-accent-soft/70 hover:border-primary/70"
        : "hover:border-primary/50 hover:bg-accent-soft"
    }`;

  return (
    <div className="w-full relative max-w-2xl mx-auto rounded-2xl border border-border bg-card shadow-soft flex flex-col min-h-[420px]">
      <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-3 sticky top-0 z-10 bg-card rounded-t-2xl">
        <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 flex-1 min-w-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onTabChange("transcript")}
            className={tabButtonClass(tab === "transcript")}
          >
            <FileText
              className={`w-4 h-4 transition-colors ${
                tab === "transcript"
                  ? "text-primary"
                  : "text-muted-foreground group-hover:text-primary"
              }`}
            />
            <span
              className={`transition-colors ${
                tab === "transcript"
                  ? "text-primary"
                  : "group-hover:text-primary"
              }`}
            >
              {labels.transcript}
            </span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onTabChange("summary")}
            className={tabButtonClass(tab === "summary")}
          >
            <Sparkles
              className={`w-4 h-4 transition-colors ${
                tab === "summary"
                  ? "text-primary"
                  : "text-muted-foreground group-hover:text-primary"
              }`}
            />
            <span
              className={`transition-colors ${
                tab === "summary" ? "text-primary" : "group-hover:text-primary"
              }`}
            >
              {labels.summary}
            </span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onTabChange("chat")}
            className={tabButtonClass(tab === "chat")}
          >
            <MessageCircle
              className={`w-4 h-4 transition-colors ${
                tab === "chat"
                  ? "text-primary"
                  : "text-muted-foreground group-hover:text-primary"
              }`}
            />
            <span
              className={`transition-colors ${
                tab === "chat" ? "text-primary" : "group-hover:text-primary"
              }`}
            >
              {labels.chat}
            </span>
          </Button>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDownload}
          disabled={tab === "chat" || !canDownload || isLoading}
          className="w-full sm:w-auto rounded-xl border-border hover:border-primary/50 hover:bg-accent-soft transition-all duration-200 group sm:ml-auto"
        >
          <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="transition-colors group-hover:text-primary">
            {labels.download}
          </span>
        </Button>
      </div>

      <div className="flex-1 max-h-[50vh] overflow-auto p-4 pb-[60px]">
        <div className={tab === "chat" ? "h-full" : "hidden"}>{chat}</div>

        {tab !== "chat" &&
          (isLoading ? (
            <div className="text-sm text-muted-foreground">
              {labels.loading}
            </div>
          ) : content.trim() ? (
            <div className="space-y-2">
              {tab === "summary" && summaryEvaluation && (
                <div className="flex flex-wrap gap-1.5 text-[10px] px-1">
                  <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    Relevance {summaryEvaluation.relevance}/10
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    Groundedness {summaryEvaluation.groundedness}/10
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    Clarity {summaryEvaluation.clarity}/10
                  </span>
                </div>
              )}
              <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {content}
              </pre>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">{labels.empty}</div>
          ))}
      </div>
    </div>
  );
}
