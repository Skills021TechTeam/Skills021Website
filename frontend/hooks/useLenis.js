
Action: file_editor create /app/frontend/src/hooks/useLenis.js --file-text "import { useEffect } from \"react\";
import Lenis from \"lenis\";

export const useLenis = () => {
  useEffect(() => {
    const reduce = window.matchMedia(\"(prefers-reduced-motion: reduce)\").matches;
    if (reduce) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    let rafId;
    const raf = (time) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);
};
"
Observation: Create successful: /app/frontend/src/hooks/useLenis.js