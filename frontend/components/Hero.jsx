
Action: file_editor create /app/frontend/src/components/Hero.jsx --file-text "import { motion, useInView, useMotionValue, useSpring, useTransform, animate } from \"framer-motion\";
import { useEffect, useRef, useState } from \"react\";
import { ArrowRight, Play, Star } from \"lucide-react\";
import { MagneticButton } from \"./MagneticButton\";
import { LaptopIllustration } from \"./LaptopIllustration\";

const words = [\"Learn.\", \"Build.\", \"Get\", \"Placed.\"];

const AnimatedNumber = ({ to = 4.8, decimals = 1, duration = 2 }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const controls = animate(0, to, {
      duration,
      ease: \"easeOut\",
      onUpdate: (v) => setVal(v),
    });
    return () => controls.stop();
  }, [to, duration]);
  return <span>{val.toFixed(decimals)}</span>;
};

const avatars = [
  \"https://images.pexels.com/photos/14180701/pexels-photo-14180701.jpeg\",
  \"https://images.pexels.com/photos/36608621/pexels-photo-36608621.jpeg\",
  \"https://images.pexels.com/photos/18392646/pexels-photo-18392646.jpeg\",
  \"https://images.pexels.com/photos/2530364/pexels-photo-2530364.jpeg\",
];

export const Hero = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: \"-100px\" });

  return (
    <section
      ref={ref}
      id=\"home\"
      data-testid=\"hero-section\"
      className=\"relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col items-center px-6 pb-16 pt-32 sm:px-8 lg:pt-40 xl:flex-row xl:gap-10\"
    >
      {/* Left */}
      <div className=\"flex-1\">
        {/* Eyebrow badge */}
        <motion.div
          initial={{ opacity: 0, y: 20, filter: \"blur(8px)\" }}
          animate={inView ? { opacity: 1, y: 0, filter: \"blur(0px)\" } : {}}
          transition={{ delay: 2.6, duration: 0.6 }}
          className=\"glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground\"
        >
          <span className=\"relative flex h-2 w-2\">
            <span className=\"pulse-ring absolute inline-flex h-full w-full rounded-full bg-violet-400\" />
            <span className=\"relative inline-flex h-2 w-2 rounded-full bg-violet-500\" />
          </span>
          New cohort starting soon — limited seats
        </motion.div>

        {/* Headline */}
        <h1 className=\"mt-6 text-5xl font-bold leading-[1.05] tracking-tighter sm:text-6xl lg:text-7xl\">
          {words.map((w, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 40, filter: \"blur(10px)\" }}
              animate={inView ? { opacity: 1, y: 0, filter: \"blur(0px)\" } : {}}
              transition={{ delay: 2.6 + i * 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className={`mr-3 inline-block ${w === \"Placed.\" ? \"relative\" : \"\"}`}
            >
              {w === \"Placed.\" ? (
                <span className=\"relative\">
                  <span className=\"gradient-text\">Placed.</span>
                  <motion.svg
                    className=\"absolute -bottom-2 left-0 w-full\"
                    height=\"14\"
                    viewBox=\"0 0 200 14\"
                    fill=\"none\"
                  >
                    <motion.path
                      d=\"M2 8 Q 60 2 100 6 T 198 5\"
                      stroke=\"url(#uGrad)\"
                      strokeWidth=\"3\"
                      strokeLinecap=\"round\"
                      fill=\"none\"
                      initial={{ pathLength: 0 }}
                      animate={inView ? { pathLength: 1 } : {}}
                      transition={{ delay: 3.5, duration: 1.2, ease: \"easeInOut\" }}
                    />
                    <defs>
                      <linearGradient id=\"uGrad\" x1=\"0\" x2=\"1\">
                        <stop offset=\"0%\" stopColor=\"#8b5cf6\" />
                        <stop offset=\"100%\" stopColor=\"#3b82f6\" />
                      </linearGradient>
                    </defs>
                  </motion.svg>
                </span>
              ) : (
                w
              )}
            </motion.span>
          ))}
        </h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 3.4, duration: 0.7 }}
          className=\"mt-6 max-w-xl text-lg text-muted-foreground sm:text-xl\"
        >
          Master in-demand tech skills through project-based cohorts. Ship real products,
          build a killer portfolio, and land your dream job — all with{\" \"}
          <span className=\"font-semibold text-foreground\">Skills021</span>.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 3.6, duration: 0.7 }}
          className=\"mt-8 flex flex-wrap items-center gap-4\"
        >
          <MagneticButton data-testid=\"hero-cta-primary\" className=\"group\">
            Start learning free
            <ArrowRight
              size={16}
              className=\"transition-transform duration-300 group-hover:translate-x-1\"
            />
          </MagneticButton>
          <MagneticButton variant=\"ghost\" data-testid=\"hero-cta-secondary\">
            <Play size={14} className=\"fill-current\" />
            Watch demo
          </MagneticButton>
        </motion.div>

        {/* Avatars + rating */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ delay: 3.8, duration: 0.7 }}
          className=\"mt-10 flex items-center gap-5\"
        >
          <div className=\"flex -space-x-3\">
            {avatars.map((a, i) => (
              <motion.img
                key={i}
                src={a}
                alt=\"student\"
                initial={{ opacity: 0, x: -20, scale: 0.7 }}
                animate={inView ? { opacity: 1, x: 0, scale: 1 } : {}}
                transition={{
                  delay: 3.8 + i * 0.12,
                  type: \"spring\",
                  stiffness: 300,
                  damping: 15,
                }}
                className=\"h-11 w-11 rounded-full border-2 border-background object-cover shadow-md\"
              />
            ))}
            <div className=\"flex h-11 w-11 items-center justify-center rounded-full border-2 border-background bg-gradient-to-br from-violet-600 to-blue-600 text-[11px] font-bold text-white shadow-md\">
              +12k
            </div>
          </div>
          <div className=\"flex flex-col\">
            <div className=\"flex items-center gap-1\">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.span
                  key={i}
                  animate={{ scale: [1, 1.2, 1], opacity: [1, 0.6, 1] }}
                  transition={{
                    delay: i * 0.4,
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3,
                  }}
                >
                  <Star size={14} className=\"fill-amber-400 text-amber-400\" />
                </motion.span>
              ))}
              <span data-testid=\"hero-rating\" className=\"ml-1 text-sm font-bold\">
                <AnimatedNumber to={4.8} />
              </span>
            </div>
            <span className=\"text-xs text-muted-foreground\">from 12,000+ students</span>
          </div>
        </motion.div>
      </div>

      {/* Right (illustration) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ delay: 2.8, duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className=\"mt-16 flex-1 xl:mt-0\"
      >
        <LaptopIllustration />
      </motion.div>
    </section>
  );
};
"
Observation: Create successful: /app/frontend/src/components/Hero.jsx