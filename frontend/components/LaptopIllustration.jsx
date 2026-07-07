
Action: file_editor create /app/frontend/src/components/LaptopIllustration.jsx --file-text "import { motion, useMotionValue, useSpring, useTransform } from \"framer-motion\";
import { Code2, GraduationCap, BarChart3, BookOpen } from \"lucide-react\";
import { useRef } from \"react\";

const OrbitCard = ({ icon: Icon, label, sub, style, floatClass, iconAnim, testid, tone }) => {
  const tones = {
    violet: \"from-violet-500 to-purple-500 shadow-violet-500/30\",
    blue: \"from-blue-500 to-cyan-500 shadow-blue-500/30\",
    pink: \"from-pink-500 to-rose-500 shadow-pink-500/30\",
    amber: \"from-amber-500 to-orange-500 shadow-amber-500/30\",
  };
  return (
    <motion.div
      data-testid={testid}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1.2, duration: 0.6, type: \"spring\" }}
      className={`glass-strong absolute z-20 flex items-center gap-3 rounded-2xl px-4 py-3 shadow-xl ${floatClass}`}
      style={style}
    >
      <motion.div
        animate={iconAnim}
        transition={{ duration: 3, repeat: Infinity, ease: \"easeInOut\" }}
        className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tones[tone]} text-white shadow-lg`}
      >
        <Icon size={18} />
      </motion.div>
      <div className=\"text-left\">
        <div className=\"text-sm font-semibold leading-tight\">{label}</div>
        <div className=\"text-[11px] text-muted-foreground\">{sub}</div>
      </div>
    </motion.div>
  );
};

export const LaptopIllustration = () => {
  const wrapRef = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 150, damping: 20 });
  const sy = useSpring(my, { stiffness: 150, damping: 20 });
  const rotY = useTransform(sx, [-1, 1], [-6, 6]);
  const rotX = useTransform(sy, [-1, 1], [4, -4]);
  const tx = useTransform(sx, [-1, 1], [-10, 10]);
  const ty = useTransform(sy, [-1, 1], [-6, 6]);

  const handleMove = (e) => {
    const rect = wrapRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mx.set(x * 2);
    my.set(y * 2);
  };
  const handleLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <div
      ref={wrapRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className=\"relative mx-auto h-[520px] w-full max-w-[600px]\"
      data-testid=\"laptop-illustration\"
    >
      {/* Glow behind laptop */}
      <div className=\"absolute inset-x-8 top-16 h-80 rounded-full bg-gradient-to-br from-violet-500/40 via-fuchsia-500/20 to-blue-500/40 blur-3xl\" />

      {/* Dashed orbit rings */}
      <svg className=\"spin-slow absolute inset-0 z-10 opacity-40\" viewBox=\"0 0 600 520\" fill=\"none\">
        <ellipse cx=\"300\" cy=\"260\" rx=\"270\" ry=\"180\" stroke=\"url(#ringG)\" strokeWidth=\"1.2\" strokeDasharray=\"5 8\" />
        <defs>
          <linearGradient id=\"ringG\" x1=\"0\" x2=\"1\">
            <stop offset=\"0%\" stopColor=\"#8b5cf6\" />
            <stop offset=\"100%\" stopColor=\"#3b82f6\" />
          </linearGradient>
        </defs>
      </svg>
      <svg className=\"spin-reverse absolute inset-4 z-10 opacity-30\" viewBox=\"0 0 600 520\" fill=\"none\">
        <ellipse cx=\"300\" cy=\"260\" rx=\"230\" ry=\"140\" stroke=\"url(#ringG2)\" strokeWidth=\"1\" strokeDasharray=\"4 10\" />
        <defs>
          <linearGradient id=\"ringG2\" x1=\"0\" x2=\"1\">
            <stop offset=\"0%\" stopColor=\"#3b82f6\" />
            <stop offset=\"100%\" stopColor=\"#8b5cf6\" />
          </linearGradient>
        </defs>
      </svg>

      {/* Laptop */}
      <motion.div
        className=\"float-slow absolute left-1/2 top-1/2 z-10 w-[440px] -translate-x-1/2 -translate-y-1/2\"
        style={{ rotateX: rotX, rotateY: rotY, x: tx, y: ty, transformStyle: \"preserve-3d\" }}
      >
        {/* Screen */}
        <div className=\"relative rounded-t-2xl border border-black/10 bg-gradient-to-br from-zinc-900 to-zinc-800 p-2 shadow-2xl dark:border-white/10\">
          <div className=\"relative aspect-[16/10] overflow-hidden rounded-xl bg-gradient-to-br from-slate-950 via-violet-950/40 to-blue-950/40\">
            {/* Fake code editor UI */}
            <div className=\"flex items-center gap-1.5 border-b border-white/10 px-3 py-2\">
              <span className=\"h-2.5 w-2.5 rounded-full bg-red-400\" />
              <span className=\"h-2.5 w-2.5 rounded-full bg-yellow-400\" />
              <span className=\"h-2.5 w-2.5 rounded-full bg-green-400\" />
              <div className=\"ml-3 h-2 w-32 rounded-full bg-white/10\" />
            </div>
            <div className=\"grid grid-cols-[80px_1fr] gap-2 p-3 font-mono text-[10px] leading-relaxed\">
              <div className=\"space-y-1 text-white/30\">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <div key={n}>{n}</div>
                ))}
              </div>
              <div className=\"space-y-1\">
                <div className=\"text-violet-300\">function <span className=\"text-blue-300\">learn</span>() {`{`}</div>
                <div className=\"pl-4 text-emerald-300\">const skills = <span className=\"text-amber-300\">{`'react'`}</span>;</div>
                <div className=\"pl-4 text-white/70\">build(skills);</div>
                <div className=\"pl-4 text-white/70\">practice();</div>
                <div className=\"pl-4 text-pink-300\">return <span className=\"text-emerald-300\">{`'placed'`}</span>;</div>
                <div className=\"text-violet-300\">{`}`}</div>
                <div className=\"text-white/40\">// Skills021 → your future</div>
                <div>
                  <span className=\"text-blue-300\">learn</span>
                  <span className=\"text-white/70\">();</span>
                  <span className=\"ml-1 inline-block h-3 w-1 animate-pulse bg-violet-400 align-middle\" />
                </div>
              </div>
            </div>
            {/* Screen glow */}
            <div className=\"pointer-events-none absolute inset-0 bg-gradient-to-t from-violet-500/10 via-transparent to-blue-500/10\" />
          </div>
        </div>
        {/* Base */}
        <div className=\"relative\">
          <div className=\"mx-auto h-3 w-[110%] -translate-x-[4.5%] rounded-b-[16px] bg-gradient-to-b from-zinc-700 to-zinc-900 shadow-xl\" />
          <div className=\"mx-auto h-1 w-16 -translate-y-1 rounded-b-xl bg-zinc-800/80\" />
        </div>
        {/* Reflection */}
        <div className=\"mx-auto mt-4 h-6 w-3/4 rounded-full bg-violet-500/30 blur-xl\" />
      </motion.div>

      {/* Orbit cards */}
      <OrbitCard
        testid=\"orbit-card-coding\"
        icon={Code2}
        label=\"Live Coding\"
        sub=\"Hands-on projects\"
        tone=\"violet\"
        floatClass=\"float-med\"
        style={{ top: \"8%\", left: \"-2%\" }}
        iconAnim={{ rotate: [0, 360] }}
      />
      <OrbitCard
        testid=\"orbit-card-graduation\"
        icon={GraduationCap}
        label=\"Placement\"
        sub=\"150+ hiring partners\"
        tone=\"blue\"
        floatClass=\"float-fast\"
        style={{ top: \"12%\", right: \"-4%\" }}
        iconAnim={{ y: [0, -4, 0] }}
      />
      <OrbitCard
        testid=\"orbit-card-analytics\"
        icon={BarChart3}
        label=\"Progress Tracking\"
        sub=\"Real-time analytics\"
        tone=\"pink\"
        floatClass=\"float-slow\"
        style={{ bottom: \"10%\", left: \"-4%\" }}
        iconAnim={{ scale: [1, 1.15, 1] }}
      />
      <OrbitCard
        testid=\"orbit-card-resource\"
        icon={BookOpen}
        label=\"500+ Resources\"
        sub=\"Curated library\"
        tone=\"amber\"
        floatClass=\"float-med\"
        style={{ bottom: \"6%\", right: \"0%\" }}
        iconAnim={{ y: [0, -6, 0] }}
      />

      {/* Tiny geometric shapes */}
      <motion.div
        className=\"absolute right-[10%] top-[40%] h-3 w-3 rotate-45 bg-gradient-to-br from-violet-400 to-blue-400\"
        animate={{ y: [0, -20, 0], rotate: [45, 90, 45] }}
        transition={{ duration: 5, repeat: Infinity, ease: \"easeInOut\" }}
      />
      <motion.div
        className=\"absolute left-[8%] top-[55%] h-2 w-2 rounded-full bg-blue-400\"
        animate={{ y: [0, 16, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: \"easeInOut\" }}
      />
      <motion.div
        className=\"absolute right-[16%] bottom-[35%] h-2 w-6 rounded-full bg-gradient-to-r from-violet-400 to-blue-400\"
        animate={{ x: [0, 12, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: \"easeInOut\" }}
      />
    </div>
  );
};
"
Observation: Create successful: /app/frontend/src/components/LaptopIllustration.jsx