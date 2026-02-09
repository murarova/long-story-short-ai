import type { ReactNode } from "react";
import { motion, type Transition, type Variants } from "framer-motion";

const DEFAULT_TRANSITION: Transition = { duration: 0.3 };

export function AnimatedStage(props: {
  motionKey: string;
  variants: Variants;
  children: ReactNode;
  className?: string;
  transition?: Transition;
}): JSX.Element {
  const { motionKey, variants, children, className, transition } = props;

  return (
    <motion.div
      key={motionKey}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transition ?? DEFAULT_TRANSITION}
      className={className}
    >
      {children}
    </motion.div>
  );
}
