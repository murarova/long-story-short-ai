import { motion } from "framer-motion";
import { useLanguage, Language } from "@/contexts/LanguageContext";

const languages: { code: Language; label: string; flag: string }[] = [
  { code: "uk", label: "UA", flag: "🇺🇦" },
  { code: "en", label: "EN", flag: "🇬🇧" },
];

export const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code)}
          className={`
            relative px-3 py-1.5 text-sm font-medium rounded-md transition-colors
            ${language === lang.code 
              ? "text-foreground" 
              : "text-muted-foreground hover:text-foreground"
            }
          `}
        >
          {language === lang.code && (
            <motion.div
              layoutId="language-indicator"
              className="absolute inset-0 bg-background rounded-md shadow-sm"
              transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <span>{lang.flag}</span>
            <span>{lang.label}</span>
          </span>
        </button>
      ))}
    </div>
  );
};
