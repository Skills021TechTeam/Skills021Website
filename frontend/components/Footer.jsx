
Action: file_editor create /app/frontend/src/components/Footer.jsx --file-text "import { motion } from \"framer-motion\";
import { Github, Twitter, Linkedin, Instagram, Sparkles, ArrowRight } from \"lucide-react\";
import { MagneticButton } from \"./MagneticButton\";

const columns = [
  {
    title: \"Programs\",
    links: [\"Web Development\", \"AI & ML\", \"Data Analytics\", \"Product Design\", \"Cybersecurity\"],
  },
  {
    title: \"Company\",
    links: [\"About\", \"Careers\", \"Hiring partners\", \"Press\", \"Contact\"],
  },
  {
    title: \"Resources\",
    links: [\"Blog\", \"Student stories\", \"Free workshops\", \"Community\", \"FAQ\"],
  },
];

export const Footer = () => {
  return (
    <footer id=\"footer\" className=\"relative z-10 mx-auto max-w-7xl px-6 pb-10 pt-24 sm:px-8\">
      {/* CTA card */}
      <motion.div
        initial={{ opacity: 0, y: 40, filter: \"blur(6px)\" }}
        whileInView={{ opacity: 1, y: 0, filter: \"blur(0px)\" }}
        viewport={{ once: true, margin: \"-100px\" }}
        transition={{ duration: 0.8 }}
        className=\"glass-strong relative mb-20 overflow-hidden rounded-[32px] px-8 py-14 text-center sm:px-16 sm:py-20\"
      >
        <div className=\"absolute inset-0 -z-0 opacity-70\">
          <div className=\"absolute -top-20 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-gradient-to-br from-violet-500/40 to-blue-500/40 blur-3xl\" />
        </div>
        <div className=\"relative z-10\">
          <div className=\"mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/50 px-3 py-1 text-xs font-medium text-muted-foreground dark:border-white/10 dark:bg-white/5\">
            <Sparkles size={12} className=\"text-violet-500\" />
            Ready when you are
          </div>
          <h2 className=\"mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl\">
            Your future is <span className=\"gradient-text\">one cohort away</span>.
          </h2>
          <p className=\"mx-auto mt-4 max-w-xl text-muted-foreground\">
            Join 12,000+ students turning skills into careers. No fluff, no lectures — just build, ship, get hired.
          </p>
          <div className=\"mt-8 flex flex-wrap items-center justify-center gap-3\">
            <MagneticButton data-testid=\"footer-cta\" className=\"group\">
              Apply to next cohort
              <ArrowRight size={16} className=\"transition-transform group-hover:translate-x-1\" />
            </MagneticButton>
            <MagneticButton variant=\"ghost\">Talk to a mentor</MagneticButton>
          </div>
        </div>
      </motion.div>

      {/* Footer grid */}
      <div className=\"grid grid-cols-2 gap-10 border-t border-black/5 pt-14 dark:border-white/10 md:grid-cols-5\">
        <div className=\"col-span-2\">
          <div className=\"flex items-center gap-2 font-bold text-xl\">
            <div className=\"flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 text-white\">
              <Sparkles size={16} />
            </div>
            <span>
              <span className=\"gradient-text\">Skills</span>021
            </span>
          </div>
          <p className=\"mt-4 max-w-xs text-sm text-muted-foreground\">
            The modern EdTech platform helping India&apos;s next generation of engineers, designers,
            and product builders ship real work and land real jobs.
          </p>
          <div className=\"mt-6 flex gap-3\">
            {[Github, Twitter, Linkedin, Instagram].map((Icon, i) => (
              <motion.a
                key={i}
                whileHover={{ y: -3, scale: 1.05 }}
                data-testid={`social-${i}`}
                href=\"#\"
                className=\"flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/60 text-muted-foreground transition-colors hover:text-foreground dark:border-white/10 dark:bg-white/5\"
              >
                <Icon size={16} />
              </motion.a>
            ))}
          </div>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <div className=\"text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground\">
              {col.title}
            </div>
            <ul className=\"mt-5 space-y-3\">
              {col.links.map((l) => (
                <li key={l}>
                  <a
                    href=\"#\"
                    className=\"text-sm text-foreground/80 transition-colors hover:text-foreground\"
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Massive brand type */}
      <div className=\"mt-20 overflow-hidden\">
        <div className=\"select-none whitespace-nowrap text-center text-[16vw] font-black leading-none tracking-tighter\">
          <span className=\"gradient-text\">Skills021</span>
        </div>
      </div>

      <div className=\"mt-8 flex flex-col items-center justify-between gap-4 border-t border-black/5 pt-6 text-xs text-muted-foreground dark:border-white/10 sm:flex-row\">
        <div>© {new Date().getFullYear()} Skills021 — Learn. Build. Get Placed.</div>
        <div className=\"flex gap-6\">
          <a href=\"#\" className=\"hover:text-foreground\">Privacy</a>
          <a href=\"#\" className=\"hover:text-foreground\">Terms</a>
          <a href=\"#\" className=\"hover:text-foreground\">Cookies</a>
        </div>
      </div>
    </footer>
  );
};
"
Observation: Create successful: /app/frontend/src/components/Footer.jsx