import { motion } from "framer-motion";
import LogoIcon from "../../assets/Logo";

export const Logo = () => {
  return (
    <motion.div
      className="flex items-center gap-2"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="text-primary-foreground">
        <LogoIcon />
      </div>
      <span className="text-lg font-semibold text-foreground tracking-tight">
        Long Story Short AI
      </span>
    </motion.div>
  );
};
