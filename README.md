# Long Story Short AI

An AI-agentic system that turns audio and video content into an interactive, question-answering chatbot. Upload a file or paste a YouTube link and the agent will transcribe, index, and reason over the content using a RAG pipeline with autonomous tool calling and built-in self-evaluation.

## Architecture

See [`architecture.mmd`](./architecture.mmd) for a Mermaid diagram of the full system.

The project is a monorepo with three packages:

| Package | Path | Role |
|---|---|---|
| **rag-core** | `server/rag-core/` | Shared library: transcription, chunking, indexing, hybrid retrieval, agent, tools, evaluation |
| **api** | `server/api/` | Express REST server: file uploads, YouTube downloads, ingestion lifecycle, chat endpoint |
| **client** | `client/` | React SPA: upload UI, processing status, chat interface, evaluation scores |

## Agentic Components

### 1. Data Preparation & Contextualization

- Audio transcription via **OpenAI Whisper** (`transcription.ts`)
- Video-to-audio extraction with **ffmpeg** (`ffmpeg.ts`)
- YouTube audio download with **yt-dlp** (`ytdlp.ts`)
- Text chunking with `RecursiveCharacterTextSplitter` from LangChain (`chunking.ts`)
- Metadata enrichment (source type, chunk index, access level)

### 2. RAG Pipeline

- **OpenAI Embeddings** (`text-embedding-3-small`) for vector representations (`models.ts`)
- **FAISS** vector store for similarity search (`indexing.ts`)
- **Hybrid retrieval** combining FAISS vector search + BM25 keyword matching with reciprocal rank fusion (`retrieval.ts`)
- Query expansion with token/phrase synonym support
- LRU caching (256 entries) and metadata filtering

### 3. Reasoning & Reflection

The LangChain agent (`agent.ts`) follows a structured reasoning loop:

1. Analyse the user question
2. Choose and invoke the appropriate tool(s)
3. Reflect on whether retrieved context is sufficient
4. If not, retry with a different query or tool
5. Verify the final answer is grounded in the context

The agent is limited to **4 reasoning iterations** (`recursionLimit: 4`) to balance quality and latency.

### 4. Tool Calling

Three tools are registered with the agent (`tools.ts`):

| Tool | Description |
|---|---|
| `search_transcript` | Hybrid semantic + keyword search over transcript chunks |
| `get_full_transcript` | Returns the complete transcript (truncated to 12 000 chars) |
| `get_summary` | Generates a concise LLM summary of the transcript (cached per ingestion session) |

**Caching strategy:**
- Summary tool caches its result per ingestion session (first call hits the model, subsequent calls return cached text)
- Answer cache stores question → answer mappings per session to avoid redundant LLM calls

### 5. Evaluation

Evaluation is selectively enabled for **summary requests only** (`apiEntrypoint.ts`). When a user requests a summary, an LLM-as-judge (`evaluation.ts`) scores the answer on three dimensions (0–10):

- **Relevance** — does the answer address the question?
- **Groundedness** — is the answer supported by retrieved context?
- **Clarity** — is the answer well-structured and easy to understand?

Evaluation scores are displayed in the **Summary tab** of the UI. Regular chat questions skip evaluation to reduce API costs and latency.

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (Node 18+) |
| LLM (agent) | OpenAI GPT-4o via `@langchain/openai` |
| LLM (tools/eval) | OpenAI GPT-4o-mini via `@langchain/openai` |
| LLM (transcription) | OpenAI Whisper via `openai` SDK |
| Agent framework | LangChain (`langchain`) |
| Embeddings | OpenAI Embeddings (`text-embedding-3-small`) |
| Vector store | FAISS (`faiss-node`) |
| Keyword search | BM25 (`@langchain/community`) |
| API server | Express + Multer |
| Frontend | React 18, Vite, Tailwind CSS, shadcn/ui (Radix primitives) |
| External tools | ffmpeg (video → audio), yt-dlp (YouTube download) |

## Prerequisites

- **Node.js** ≥ 18 (see `.nvmrc`)
- **ffmpeg** — required for video file uploads
- **yt-dlp** — required for YouTube link ingestion
- An **OpenAI API key** (for Whisper transcription, GPT-4o chat, GPT-4o-mini helper/eval, and embeddings)

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd long-story-short-ai

npm --prefix server/rag-core install
npm --prefix server/api install
npm --prefix client install
```

### 2. Configure environment

Create a `.env` file in the project root:

```
OPENAI_API_KEY=<your-openai-key>
```

Optional environment variables:
- `OPENAI_CHAT_MODEL` — override default chat model (default: `gpt-4o`)
- `OPENAI_EMBEDDING_MODEL` — override default embedding model (default: `text-embedding-3-small`)

### 3. Run the API server

```bash
npm run dev:api
```

This builds `rag-core` automatically and starts the Express server on `http://localhost:3001`.

### 4. Run the client

```bash
npm run dev:client
```

Opens the React app on `http://localhost:5173` (default Vite port).

### 5. Use the app

1. Upload an audio/video file or paste a YouTube URL.
2. Wait for transcription and indexing to complete.
3. Switch between tabs:
   - **Transcript** — view the full transcribed text
   - **Summary** — see an AI-generated summary with evaluation scores
   - **Ask Questions** — chat with the agent about the content

## Performance Optimizations

- **Per-ingestion mutex** — ensures only one `/ask` request runs at a time per ingestion to prevent race conditions
- **Request timeout** — 120 second timeout on `/ask` endpoint to prevent hanging requests
- **Answer caching** — questions are cached per session to avoid redundant LLM calls
- **Summary caching** — summary tool caches its result per ingestion (first call uses the model, subsequent calls return cached text)
- **Selective evaluation** — evaluation only runs for summary requests, not regular chat questions
- **Model call metrics** — server logs `rag.ask.metrics` JSON with counts of agent/helper/eval calls and elapsed time

## Project Structure

```
long-story-short-ai/
├── client/                  React frontend
│   └── src/
│       ├── components/      UI components (chat, upload, results, preview)
│       ├── hooks/           Custom hooks (polling, main controller, preview, history, ingestion)
│       ├── lib/             API client, utilities
│       ├── contexts/        Language/i18n context
│       └── pages/           Route pages
├── server/
│   ├── api/                 Express API
│   │   └── src/
│   │       ├── controllers/ Request handlers
│   │       ├── middleware/  Auth session middleware
│   │       ├── routes/      Route definitions
│   │       ├── services/    Ingestion service (orchestration, mutex, cleanup)
│   │       └── utils/       ffmpeg, yt-dlp, logging, errors
│   └── rag-core/            Shared RAG library
│       └── src/
│           ├── agent.ts         LangChain agent with reflection (recursionLimit: 4)
│           ├── apiEntrypoint.ts Session builder (wires everything, caching, selective eval)
│           ├── chunking.ts      Text splitting
│           ├── config.ts        Model names (gpt-4o, gpt-4o-mini)
│           ├── documentLoaders.ts Audio → Document
│           ├── evaluation.ts    LLM-as-judge scoring (OpenAI)
│           ├── indexing.ts      FAISS vector store (in-memory)
│           ├── models.ts        Embedding + chat model factories (OpenAI)
│           ├── retrieval.ts     Hybrid retriever (FAISS + BM25)
│           ├── tools.ts         Agent tools (with summary caching)
│           └── transcription.ts Whisper transcription
├── architecture.mmd         System architecture diagram
└── .env                     API keys (not committed)
```
