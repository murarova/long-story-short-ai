import { useEffect, useRef, useState } from "react";
import { getIngestion, type Ingestion } from "@/lib/ragApi";

export function useIngestionPolling(
  ingestionId: string | null,
  enabled: boolean,
  options?: { intervalMs?: number }
): { status: Ingestion | null; error: string | null; isPolling: boolean } {
  const intervalMs = options?.intervalMs ?? 1500;
  const pollerRef = useRef<number | null>(null);

  const [status, setStatus] = useState<Ingestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    if (pollerRef.current) {
      window.clearInterval(pollerRef.current);
      pollerRef.current = null;
    }

    setError(null);
    setIsPolling(false);

    if (!enabled || !ingestionId) {
      setStatus(null);
      return;
    }

    setIsPolling(true);
    pollerRef.current = window.setInterval(async () => {
      try {
        const next = await getIngestion(ingestionId);
        setStatus(next);

        // Stop polling when finished.
        if (next.status === "ready" || next.status === "error") {
          if (pollerRef.current) window.clearInterval(pollerRef.current);
          pollerRef.current = null;
          setIsPolling(false);
        }
      } catch (e: unknown) {
        if (pollerRef.current) window.clearInterval(pollerRef.current);
        pollerRef.current = null;
        setIsPolling(false);
        setError(e instanceof Error ? e.message : "Unexpected error");
      }
    }, intervalMs);

    return () => {
      if (pollerRef.current) window.clearInterval(pollerRef.current);
      pollerRef.current = null;
    };
  }, [enabled, ingestionId, intervalMs]);

  return { status, error, isPolling };
}

