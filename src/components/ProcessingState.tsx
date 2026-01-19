import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface ProcessingStateProps {
  fileName: string;
}

const steps = [
  "Extracting audio...",
  "Transcribing content...",
  "Analyzing speech patterns...",
  "Segmenting into topics...",
  "Preparing chat interface...",
];

export const ProcessingState = ({ fileName }: ProcessingStateProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-md mx-auto text-center"
    >
      {/* Animated Loader */}
      <div className="relative w-24 h-24 mx-auto mb-8">
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-accent-soft"
        />
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-2 rounded-full border-4 border-transparent border-t-primary/60"
          animate={{ rotate: -360 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center"
          >
            <div className="w-4 h-4 rounded-full bg-primary" />
          </motion.div>
        </div>
      </div>

      {/* File Name */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-foreground font-medium mb-2 truncate px-4"
      >
        {fileName}
      </motion.p>

      {/* Current Step */}
      <motion.p
        key={currentStep}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="text-muted-foreground text-sm"
      >
        {steps[currentStep]}
      </motion.p>

      {/* Progress Dots */}
      <div className="flex items-center justify-center gap-2 mt-6">
        {steps.map((_, index) => (
          <motion.div
            key={index}
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              index === currentStep ? 'bg-primary' : 'bg-muted'
            }`}
            animate={index === currentStep ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.5 }}
          />
        ))}
      </div>
    </motion.div>
  );
};
