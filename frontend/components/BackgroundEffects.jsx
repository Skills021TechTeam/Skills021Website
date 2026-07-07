
Action: file_editor create /app/frontend/src/components/BackgroundEffects.jsx --file-text "import { useMemo } from \"react\";

export const BackgroundEffects = () => {
  const particles = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 8,
        duration: 6 + Math.random() * 10,
        size: 2 + Math.random() * 4,
      })),
    []
  );

  return (
    <div className=\"pointer-events-none fixed inset-0 z-0 overflow-hidden\">
      {/* Aurora blobs */}
      <div
        className=\"aurora aurora-1\"
        style={{
          top: \"-10%\",
          left: \"-10%\",
          width: 500,
          height: 500,
          background: \"radial-gradient(circle, #a78bfa 0%, transparent 70%)\",
        }}
      />
      <div
        className=\"aurora aurora-2\"
        style={{
          top: \"20%\",
          right: \"-15%\",
          width: 600,
          height: 600,
          background: \"radial-gradient(circle, #60a5fa 0%, transparent 70%)\",
        }}
      />
      <div
        className=\"aurora aurora-3\"
        style={{
          bottom: \"-15%\",
          left: \"30%\",
          width: 550,
          height: 550,
          background: \"radial-gradient(circle, #c084fc 0%, transparent 70%)\",
        }}
      />

      {/* Dotted grid */}
      <div className=\"dotted-grid absolute inset-0 opacity-60\" />

      {/* Floating particles */}
      {particles.map((p) => (
        <span
          key={p.id}
          className=\"absolute rounded-full bg-gradient-to-br from-violet-400 to-blue-400\"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            opacity: 0.4,
            animation: `float-up-down ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}

      {/* Noise overlay */}
      <div className=\"noise absolute inset-0\" />
    </div>
  );
};
"
Observation: Create successful: /app/frontend/src/components/BackgroundEffects.jsx