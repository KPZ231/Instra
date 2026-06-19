"use client";

import { motion } from "framer-motion";

/**
 * @function PageTransition
 * @description Opakowuje zawartość strony w animację wejścia (fade-in + lekkie przesunięcie w górę).
 * Używany w page.tsx jako wrapper dla wszystkich sekcji.
 *
 * @param {{ children: React.ReactNode }} props
 * @returns {JSX.Element}
 * @example
 * <PageTransition><Hero /><AboutProject /></PageTransition>
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {children}
    </motion.main>
  );
}
