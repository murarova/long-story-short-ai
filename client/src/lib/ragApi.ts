export type IngestionStatus = "queued" | "processing" | "ready" | "error";

export type Ingestion = {
  id: string;
  status: IngestionStatus;
  error: string | null;
  createdAt: number;
  updatedAt: number;
};

function apiBaseUrl(): string {
  const env = import.meta.env.VITE_API_BASE_URL;
  return env && env.trim()
    ? env.trim().replace(/\/+$/, "")
    : "http://localhost:3001";
}

async function asJsonOrThrow<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as { error?: unknown }).error === "string"
        ? String((data as { error: string }).error)
        : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

export async function createIngestion(params: {
  audio: File;
  queryExpansions?: object | null;
}): Promise<{ ingestionId: string; status: IngestionStatus }> {
  const fd = new FormData();
  fd.append("audio", params.audio);
  if (params.queryExpansions) {
    fd.append("queryExpansions", JSON.stringify(params.queryExpansions));
  }

  const res = await fetch(`${apiBaseUrl()}/ingestions`, {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  return await asJsonOrThrow(res);
}

export async function getIngestion(ingestionId: string): Promise<Ingestion> {
  const res = await fetch(`${apiBaseUrl()}/ingestions/${ingestionId}`, {
    credentials: "include",
  });
  return await asJsonOrThrow(res);
}

export async function askIngestion(params: {
  ingestionId: string;
  question: string;
}): Promise<{ answer: string }> {
  const res = await fetch(
    `${apiBaseUrl()}/ingestions/${params.ingestionId}/ask`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: params.question }),
      credentials: "include",
    }
  );
  return await asJsonOrThrow(res);
}

export async function getTranscriptText(ingestionId: string): Promise<string> {
  const res = await fetch(
    `${apiBaseUrl()}/ingestions/${ingestionId}/transcript`,
    {
      credentials: "include",
    }
  );
  const text = await res.text();
  if (res.ok) return text;
  try {
    const data = JSON.parse(text) as { error?: unknown };
    if (typeof data?.error === "string" && data.error.trim()) {
      throw new Error(data.error);
    }
  } catch {
    // ignore
  }
  throw new Error(`Request failed (${res.status})`);
}
