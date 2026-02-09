import { createContext, useContext, useState, ReactNode } from "react";

export type Language = "uk" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  tList: (key: string) => string[];
}

type TranslationValue = string | string[];

const translations: Record<Language, Record<string, TranslationValue>> = {
  uk: {
    "app.title": "Якщо коротко",
    "app.subtitle": [
      "Тут ти можеш транскрибувати аудіо/відео файл",
      "Задати питання по змісту",
      "Сформувати конспект",
    ],
    "upload.placeholder": "Перетягніть файл або вставте URL сюди",
    "upload.dragActive": "Відпустіть файл тут...",
    "upload.browse": "Оберіть файл",
    "upload.or": "або",
    "upload.analyze": "Аналізувати",
    "upload.analyzing": "Аналізую...",
    "upload.supportedFormats":
      "Підтримувані формати: MP4, MKV, MOV, WebM, MP3, WAV, M4A",
    "processing.analyzing": "Аналізуємо ваш контент",
    "results.ready": "Ваш контент готовий",
    "results.downloadTranscript": "Завантажити повний текст",
    "results.downloadSummary": "Завантажити резюме",
    "results.askQuestions": "Задати питання",
    "chat.title": "Запитайте про ваш контент",
    "chat.inputPlaceholder": "Введіть ваше питання...",
    "chat.back": "Назад",
    "chat.suggestion1": "Підсумуй у 5 пунктах",
    "chat.suggestion2": "Які основні ідеї?",
    "chat.suggestion3": "Поясни як для 12-річного",
    "header.newAnalysis": "Новий аналіз",
    "toast.downloadingTranscript": "Завантаження транскрипту",
    "toast.downloadingTranscriptDesc":
      "Ваш повний транскрипт буде готовий незабаром.",
    "toast.generatingSummary": "Генерування резюме",
    "toast.generatingSummaryDesc": "Ваше резюме буде готове незабаром.",
    "preview.transcript": "Транскрипт",
    "preview.summary": "Резюме",
    "preview.download": "Завантажити",
    "preview.loading": "Завантаження...",
    "preview.empty": "Немає даних для попереднього перегляду.",
    "history.title": "Історія",
    "history.subtitle": "Останні результати (цей браузер)",
    "history.clear": "Очистити",
    "history.empty": "Історії ще немає. Завантажте аудіо файл, щоб почати.",
    "history.current": "поточний",
  },
  en: {
    "app.title": "Long Story Short AI",
    "app.subtitle": [
      "Transcribe any audio or video",
      "Ask questions about the content",
      "Generate a summary",
    ],
    "upload.placeholder": "Drop file or paste URL here",
    "upload.dragActive": "Drop the file here...",
    "upload.browse": "Browse files",
    "upload.or": "or",
    "upload.analyze": "Analyze",
    "upload.analyzing": "Analyzing...",
    "upload.supportedFormats":
      "Supported formats: MP4, MKV, MOV, WebM, MP3, WAV, M4A",
    "processing.analyzing": "Analyzing your content",
    "results.ready": "Your content is ready",
    "results.downloadTranscript": "Download Full Transcript",
    "results.downloadSummary": "Download Summary",
    "results.askQuestions": "Ask Questions",
    "chat.title": "Ask about your content",
    "chat.inputPlaceholder": "Type your question...",
    "chat.back": "Back",
    "chat.suggestion1": "Summarize in 5 bullets",
    "chat.suggestion2": "What are the main ideas?",
    "chat.suggestion3": "Explain like I'm 12",
    "header.newAnalysis": "New analysis",
    "toast.downloadingTranscript": "Downloading transcript",
    "toast.downloadingTranscriptDesc":
      "Your full transcript will be ready shortly.",
    "toast.generatingSummary": "Generating summary",
    "toast.generatingSummaryDesc": "Your summary will be ready shortly.",
    "preview.transcript": "Transcript",
    "preview.summary": "Summary",
    "preview.download": "Download",
    "preview.loading": "Loading...",
    "preview.empty": "Nothing to preview yet.",
    "history.title": "History",
    "history.subtitle": "Your recent analyses (this browser)",
    "history.clear": "Clear",
    "history.empty": "No history yet. Upload an audio file to start.",
    "history.current": "current",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>("uk");

  const t = (key: string): string => {
    const value = translations[language][key];
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.join(" ");
    return key;
  };

  const tList = (key: string): string[] => {
    const value = translations[language][key];
    if (Array.isArray(value)) return value;
    if (typeof value === "string") return [value];
    return [key];
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, tList }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
