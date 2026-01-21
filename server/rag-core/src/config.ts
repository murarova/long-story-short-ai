import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

export const VECTOR_DB_PATH = join(projectRoot, 'vectorstore');
export const INDEX_MANIFEST_PATH = join(projectRoot, '.index_manifest.json');
export const COLLECTION_NAME = 'rag_docs';
export const GOOGLE_CHAT_MODEL = 'models/gemini-2.5-flash';
