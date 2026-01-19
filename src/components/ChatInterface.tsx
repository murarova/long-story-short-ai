import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ArrowLeft, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatInterfaceProps {
  fileName: string;
  onBack: () => void;
}

const suggestedPrompts = [
  "Summarize in 5 bullets",
  "What are the main ideas?",
  "Explain like I'm 12",
  "List key terms and concepts",
];

export const ChatInterface = ({ fileName, onBack }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const simulateResponse = async (userMessage: string) => {
    setIsLoading(true);
    
    // Simulate AI response delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    const responses: Record<string, string> = {
      "Summarize in 5 bullets": `Here are the key points from "${fileName}":\n\n• Main topic covers the essential concepts and frameworks\n• Key speaker discusses practical applications and examples\n• Several case studies are presented with real-world data\n• Important distinctions are made between different approaches\n• Actionable recommendations provided for implementation`,
      "What are the main ideas?": `The main ideas from this content include:\n\n1. **Core Concept**: The fundamental framework being discussed\n2. **Practical Application**: How to apply these ideas in real scenarios\n3. **Key Insights**: Important observations and discoveries shared\n4. **Future Implications**: What this means going forward`,
      "Explain like I'm 12": `Okay, imagine you're learning something new! This video/audio is basically explaining a really cool idea in a simple way.\n\nThink of it like building with LEGO blocks - you start with small pieces and put them together to make something bigger and more interesting.\n\nThe speaker is showing us step by step how to do this!`,
      "List key terms and concepts": `**Key Terms & Concepts:**\n\n• **Term 1**: Definition and context\n• **Term 2**: How it relates to the main topic\n• **Concept A**: The foundational idea\n• **Concept B**: Building on the basics\n• **Framework**: The overall structure discussed`,
    };

    const response = responses[userMessage] || `Based on the content of "${fileName}", here's what I found related to your question:\n\nThe content addresses this topic by exploring various perspectives and providing detailed explanations. Key points include practical examples and clear demonstrations of the concepts.\n\nWould you like me to elaborate on any specific aspect?`;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "assistant",
        content: response,
      },
    ]);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: userMessage },
    ]);

    await simulateResponse(userMessage);
  };

  const handlePromptClick = async (prompt: string) => {
    if (isLoading) return;
    
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: prompt },
    ]);

    await simulateResponse(prompt);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-3xl mx-auto h-[600px] flex flex-col"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 pb-4 border-b border-border"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="rounded-xl hover:bg-muted"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="font-semibold text-foreground">Ask about your content</h2>
          <p className="text-sm text-muted-foreground truncate max-w-[300px]">{fileName}</p>
        </div>
      </motion.div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto py-6 space-y-4">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 rounded-2xl bg-accent-soft mx-auto mb-4 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Ready to explore</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Ask any question about your content, or try one of the suggestions below.
            </p>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === "user" && (
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="bg-muted rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 bg-muted-foreground/50 rounded-full"
                    animate={{ y: [0, -4, 0] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.1,
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      {messages.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap gap-2 pb-4"
        >
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handlePromptClick(prompt)}
              disabled={isLoading}
              className="px-4 py-2 text-sm bg-secondary hover:bg-muted rounded-full 
                         text-secondary-foreground transition-colors duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {prompt}
            </button>
          ))}
        </motion.div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="relative">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about the content..."
          disabled={isLoading}
          className="w-full h-14 pl-5 pr-14 rounded-xl bg-secondary/50 border border-border 
                     text-foreground placeholder:text-muted-foreground
                     focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                     transition-all duration-200 disabled:opacity-50"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim() || isLoading}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg w-10 h-10
                     disabled:opacity-50 transition-all duration-200"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </motion.div>
  );
};
