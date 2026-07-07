
Action: file_editor create /app/frontend/src/components/Navbar.jsx --file-text "import { motion } from \"framer-motion\";
import { useEffect, useState } from \"react\";
import { Sun, Moon, Sparkles } from \"lucide-react\";
import { useTheme } from \"../context/ThemeContext\";
import { MagneticButton } from \"./MagneticButton\";

const links = [
  { label: \"Home\", href: \"#home\" },
  { label: \"Courses\", href: \"#courses\" },
  { label: \"Students\", href: \"#testimonials\" },
  { label: \"About\", href: \"#footer\" },
];

export const Navbar = () => {
  const { theme, toggle } = useTheme();
  const [active, setActive] = useState(\"Home\");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener(\"scroll\", onScroll);
    return () => window.removeEventListener(\"scroll\", onScroll);
  }, []);

  return (
    <motion.nav
      data-testid=\"navbar\"
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 2.5, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? \"py-3\" : \"py-5\"
      }`}
    >
      <div className=\"mx-auto max-w-7xl px-6 sm:px-8\">
        <div
          className={`glass flex items-center justify-between rounded-full px-3 py-2 pl-6 transition-all duration-500 ${
            scrolled ? \"shadow-[0_10px_40px_-10px_rgba(139,92,246,0.25)]\" : \"\"
          }`}
        >
          {/* Logo */}
          <motion.a
            href=\"#home\"
            data-testid=\"nav-logo\"
            whileHover={{ scale: 1.05 }}
            className=\"group relative flex items-center gap-2 font-bold text-lg\"
          >
            <div className=\"relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-lg transition-shadow duration-300 group-hover:shadow-[0_0_25px_rgba(139,92,246,0.6)]\">
              <Sparkles size={16} />
            </div>
            <span>
              <span className=\"gradient-text\">Skills</span>
              <span>021</span>
            </span>
          </motion.a>

          {/* Center links */}
          <div className=\"hidden items-center gap-1 md:flex\">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setActive(l.label)}
                data-testid={`nav-link-${l.label.toLowerCase()}`}
                className=\"group relative rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground\"
              >
                {l.label}
                {active === l.label && (
                  <motion.span
                    layoutId=\"nav-active\"
                    className=\"absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-blue-500\"
                    transition={{ type: \"spring\", stiffness: 380, damping: 30 }}
                  />
                )}
              </a>
            ))}
          </div>

          {/* Actions */}
          <div className=\"flex items-center gap-2\">
            <motion.button
              data-testid=\"theme-toggle\"
              onClick={toggle}
              whileTap={{ scale: 0.9 }}
              className=\"relative flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/50 text-foreground transition-colors hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10\"
              aria-label=\"Toggle theme\"
            >
              <motion.div
                key={theme}
                initial={{ rotate: -180, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {theme === \"dark\" ? <Sun size={16} /> : <Moon size={16} />}
              </motion.div>
            </motion.button>

            <button
              data-testid=\"nav-login\"
              className=\"hidden rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:-translate-y-0.5 hover:text-foreground sm:block\"
            >
              Log in
            </button>

            <MagneticButton data-testid=\"nav-signup\" className=\"!py-2 !px-5 text-sm\">
              Sign up
            </MagneticButton>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};
"
Observation: Create successful: /app/frontend/src/components/Navbar.jsx