# Client (Web UI)

This folder contains the **React/Vite** client application for _Long Story Short AI_.

## What this client does

- **Audio upload**: lets the user upload an audio file.
- **Ingestion status**: starts an ingestion on the API server and polls until it becomes `ready` or `error`.
- **Transcript download**: downloads the transcript as a `.txt` file from the API.
- **Chat**: sends questions to the API for the current ingestion.

## Running locally

From the repo root:

```sh
npm --prefix client install
npm --prefix client run dev
```

The dev server runs on the port configured in `client/vite.config.ts`.

## Configuration

Set the API base URL with:

- `VITE_API_BASE_URL` (defaults to `http://localhost:3001` if not set)

Example (macOS/Linux):

```sh
VITE_API_BASE_URL=http://localhost:3001 npm --prefix client run dev
```

## Tech stack

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui
