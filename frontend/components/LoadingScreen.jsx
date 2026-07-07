
Action: file_editor create /app/frontend/src/components/LoadingScreen.jsx --file-text "import { motion, AnimatePresence } from \"framer-motion\";
import { useEffect, useState } from \"react\";

export const LoadingScreen = () => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2400);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-testid=\"loading-screen\"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -30, transition: { duration: 0.7, ease: \"easeInOut\" } }}
          className=\"fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background\"
        >
          {/* Aurora glow behind logo */}
          <div className=\"absolute h-96 w-96 rounded-full bg-gradient-to-br from-violet-500/30 to-blue-500/30 blur-3xl\" />

          <div className=\"relative flex flex-col items-center gap-8\">
            {/* Logo SVG drawing */}
            <svg width=\"140\" height=\"140\" viewBox=\"0 0 100 100\" fill=\"none\">
              <defs>
                <linearGradient id=\"logoGrad\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"100%\">
                  <stop offset=\"0%\" stopColor=\"#8b5cf6\" />
                  <stop offset=\"100%\" stopColor=\"#3b82f6\" />
                </linearGradient>
              </defs>
              <motion.path
                d=\"M20 30 Q20 15 35 15 L65 15 Q80 15 80 30 Q80 45 65 45 L35 45 Q20 45 20 60 Q20 75 35 75 L65 75 Q80 75 80 90\"
                stroke=\"url(#logoGrad)\"
                strokeWidth=\"6\"
                strokeLinecap=\"round\"
                fill=\"none\"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.6, ease: \"easeInOut\" }}
              />
            </svg>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className=\"flex flex-col items-center gap-3\"
            >
              <div className=\"text-2xl font-bold tracking-tight\">
                <span className=\"gradient-text\">Skills</span>
                <span className=\"text-foreground\">021</span>
              </div>

              {/* Loading bar */}
              <div className=\"h-1 w-48 overflow-hidden rounded-full bg-black/10 dark:bg-white/10\">
                <motion.div
                  initial={{ width: \"0%\" }}
                  animate={{ width: \"100%\" }}
                  transition={{ duration: 1.6, ease: \"easeInOut\" }}
                  className=\"h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500\"
                />
              </div>
              <div className=\"text-xs uppercase tracking-[0.3em] text-muted-foreground\">
                Preparing your journey
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
"
Observation: Create successful: /app/frontend/src/components/LoadingScreen.jsx