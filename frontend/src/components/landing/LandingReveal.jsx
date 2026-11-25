'use client';

import { motion, useReducedMotion } from 'framer-motion';

export function LandingReveal({ children, className, delay = 0, y = 20 }) {
  const reducedMotion = useReducedMotion();
  return <motion.div className={className} initial={reducedMotion ? false : { opacity: 0, y }} whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.48, delay, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>;
}
