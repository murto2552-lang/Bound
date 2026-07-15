import { motion } from 'framer-motion';

/**
 * A wrapper component that applies a smooth fade-in and slide-up animation
 * to page transitions using Framer Motion.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - The page content to animate.
 */
export default function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}
