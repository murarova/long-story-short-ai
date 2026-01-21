# Long Story Short AI (Client + Server)

This repo contains a React client and a Node/Express backend that runs the audio-only RAG pipeline.

## Structure

- `client/`: Vite/React UI
- `server/api/`: Express API server (uploads + ingestion status + transcript + chat)
- `server/rag-core/`: RAG library (transcription/chunking/embeddings/retrieval)

## Local dev

### Client

```bash
npm --prefix client run dev
```

### API

```bash
npm --prefix server/api run dev
```

## Notes

- Runtime data is stored under `server/api/uploads/` and `server/api/ingestions/` (gitignored).

