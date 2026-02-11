import { useCallback, useState } from "react";
import { toast } from "@/hooks/use-toast";
import {
  createIngestion,
  createIngestionFromUrl,
} from "@/lib/ragApi";
import { useIngestionPolling } from "@/hooks/useIngestionPolling";

export type AppState = "upload" | "processing" | "results";

const MAX_FILE_SIZE_MB = 500;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const errorMessage = (e: unknown): string =>
  e instanceof Error ? e.message : "Unexpected error";

export function useIngestion() {
  const [appState, setAppState] = useState<AppState>("upload");
  const [fileName, setFileName] = useState("");
  const [isUrl, setIsUrl] = useState(false);
  const [ingestionId, setIngestionId] = useState<string | null>(null);

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

      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          title: "File too large",
          description: `Maximum file size is ${MAX_FILE_SIZE_MB} MB. Your file is ${Math.round(file.size / 1024 / 1024)} MB.`,
        });
        return;
      }

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

  const polling = useIngestionPolling(ingestionId, appState === "processing");

  const handleCancel = useCallback(() => {
    setAppState("upload");
    setIngestionId(null);
  }, []);

  const handleReset = useCallback(() => {
    setAppState("upload");
    setFileName("");
    setIsUrl(false);
    setIngestionId(null);
  }, []);

  const openChatFor = useCallback(
    (itemIngestionId: string, itemFileName: string, itemIsUrl: boolean) => {
      setFileName(itemFileName);
      setIsUrl(itemIsUrl);
      setIngestionId(itemIngestionId);
      setAppState("results");
    },
    [],
  );

  const transitionToResults = useCallback(() => {
    setAppState("results");
  }, []);

  const transitionToUpload = useCallback(() => {
    setAppState("upload");
    setIngestionId(null);
  }, []);

  return {
    appState,
    fileName,
    isUrl,
    ingestionId,
    polling,
    handleFileSelect,
    handleCancel,
    handleReset,
    openChatFor,
    transitionToResults,
    transitionToUpload,
  };
}
