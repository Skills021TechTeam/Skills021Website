
Action: file_editor create /app/frontend/src/components/Courses.jsx --file-text "import { motion, useInView } from \"framer-motion\";
import { useRef, useState } from \"react\";
import { Code2, Palette, Brain, LineChart, ShieldCheck, Rocket, ArrowUpRight } from \"lucide-react\";

const courses = [
  {
    icon: Code2,
    tag: \"Full-Stack\",
    title: \"Web Development Pro\",
    sub: \"Build production apps with React, Node & MongoDB.\",
    weeks: 16,
    tone: \"from-violet-500 to-purple-500\",
    testid: \"course-web\",
  },
  {
    icon: Brain,
    tag: \"AI\",
    title: \"AI & Machine Learning\",
    sub: \"From Python fundamentals to LLM-powered products.\",
    weeks: 20,
    tone: \"from-blue-500 to-cyan-500\",
    testid: \"course-ai\",
  },
  {
    icon: LineChart,
    tag: \"Data\",
    title: \"Data Analytics\",
    sub: \"Turn raw data into decisions with SQL, Python & viz.\",
    weeks: 12,
    tone: \"from-pink-500 to-rose-500\",
    testid: \"course-data\",
  },
  {
    icon: Palette,
    tag: \"Design\",
    title: \"Product Design\",
    sub: \"UX research, systems, prototyping & handoff.\",
    weeks: 14,
    tone: \"from-amber-500 to-orange-500\",
    testid: \"course-design\",
  },
  {
    icon: ShieldCheck,
    tag: \"Security\",
    title: \"Cybersecurity Essentials\",
    sub: \"Defense, ethical hacking & real-world labs.\",
    weeks: 14,
    tone: \"from-emerald-500 to-teal-500\",
    testid: \"course-security\",
  },
  {
    icon: Rocket,
    tag: \"Career\",
    title: \"Placement Bootcamp\",
    sub: \"Mock interviews, DSA sprints & portfolio reviews.\",
    weeks: 8,
    tone: \"from-fuchsia-500 to-pink-500\",
    testid: \"course-career\",
  },
];

const CourseCard = ({ course, i }) => {
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  const onMove = (e) => {
    const r = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ rx: -y * 8, ry: x * 8 });
  };
  const onLeave = () => setTilt({ rx: 0, ry: 0 });

  return (
    <motion.div
      ref={cardRef}
      data-testid={course.testid}
      initial={{ opacity: 0, y: 40, filter: \"blur(6px)\" }}
      whileInView={{ opacity: 1, y: 0, filter: \"blur(0px)\" }}
      viewport={{ once: true, margin: \"-80px\" }}
      transition={{ delay: i * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
        transition: \"transform 0.15s ease-out\",
      }}
      className=\"glass group relative flex flex-col overflow-hidden rounded-3xl p-6 hover:shadow-[0_25px_60px_-25px_rgba(139,92,246,0.5)]\"
    >
      {/* animated gradient border */}
      <div className=\"pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity group-hover:opacity-100\"
        style={{
          background: `conic-gradient(from 0deg, rgba(139,92,246,0.5), rgba(59,130,246,0.5), rgba(236,72,153,0.5), rgba(139,92,246,0.5))`,
          mask: \"linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)\",
          WebkitMask: \"linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)\",
          WebkitMaskComposite: \"xor\", maskComposite: \"exclude\", padding: \"1.5px\",
        }}
      />

      <div className=\"flex items-start justify-between\">
        <motion.div
          whileHover={{ rotate: 8, scale: 1.05 }}
          className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${course.tone} text-white shadow-lg`}
        >
          <course.icon size={22} />
        </motion.div>
        <span className=\"rounded-full border border-black/10 bg-white/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground dark:border-white/10 dark:bg-white/5\">
          {course.tag}
        </span>
      </div>

      <h3 className=\"mt-6 text-xl font-semibold tracking-tight\">{course.title}</h3>
      <p className=\"mt-2 text-sm text-muted-foreground\">{course.sub}</p>

      <div className=\"mt-6 flex items-center justify-between border-t border-black/5 pt-4 dark:border-white/10\">
        <div className=\"text-xs text-muted-foreground\">
          <span className=\"font-semibold text-foreground\">{course.weeks} weeks</span> • Cohort-based
        </div>
        <div className=\"flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-white transition-transform group-hover:rotate-45\">
          <ArrowUpRight size={16} />
        </div>
      </div>
    </motion.div>
  );
};

export const Courses = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: \"-100px\" });
  return (
    <section ref={ref} id=\"courses\" className=\"relative z-10 mx-auto max-w-7xl px-6 py-24 sm:px-8\">
      <motion.div
        initial={{ opacity: 0, y: 30, filter: \"blur(8px)\" }}
        animate={inView ? { opacity: 1, y: 0, filter: \"blur(0px)\" } : {}}
        transition={{ duration: 0.8 }}
        className=\"mb-14 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end\"
      >
        <div className=\"max-w-2xl\">
          <div className=\"text-xs font-semibold uppercase tracking-[0.3em] text-violet-500 dark:text-violet-400\">
            Learn what matters
          </div>
          <h2 className=\"mt-3 text-4xl font-semibold tracking-tight sm:text-5xl\">
            Career-ready programs, <span className=\"gradient-text\">designed with hiring partners</span>.
          </h2>
        </div>
        <p className=\"max-w-md text-muted-foreground\">
          Every course is built with real engineers, designers, and hiring managers so you graduate with
          skills teams actually pay for.
        </p>
      </motion.div>

      <div className=\"grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3\">
        {courses.map((c, i) => (
          <CourseCard key={c.testid} course={c} i={i} />
        ))}
      </div>
    </section>
  );
};
"
Observation: Create successful: /app/frontend/src/components/Courses.jsx