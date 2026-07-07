
Action: file_editor create /app/frontend/src/context/ThemeContext.jsx --file-text "import { createContext, useContext, useEffect, useState } from \"react\";

const ThemeContext = createContext({ theme: \"light\", toggle: () => {} });

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    if (typeof window === \"undefined\") return \"light\";
    const stored = localStorage.getItem(\"skills021-theme\");
    if (stored) return stored;
    return window.matchMedia(\"(prefers-color-scheme: dark)\").matches ? \"dark\" : \"light\";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === \"dark\") root.classList.add(\"dark\");
    else root.classList.remove(\"dark\");
    localStorage.setItem(\"skills021-theme\", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === \"dark\" ? \"light\" : \"dark\"));

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
"
Observation: Create successful: /app/frontend/src/context/ThemeContext.jsx