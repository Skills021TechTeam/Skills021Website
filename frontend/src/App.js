
Action: file_editor create /app/frontend/src/App.js --file-text "import \"@/App.css\";
import { ThemeProvider } from \"./context/ThemeContext\";
import { useLenis } from \"./hooks/useLenis\";
import { LoadingScreen } from \"./components/LoadingScreen\";
import { Navbar } from \"./components/Navbar\";
import { Hero } from \"./components/Hero\";
import { Stats } from \"./components/Stats\";
import { Courses } from \"./components/Courses\";
import { Testimonials } from \"./components/Testimonials\";
import { Footer } from \"./components/Footer\";
import { BackgroundEffects } from \"./components/BackgroundEffects\";
import { CursorGlow } from \"./components/CursorGlow\";

function AppInner() {
  useLenis();
  return (
    <div className=\"App relative min-h-screen\">
      <LoadingScreen />
      <BackgroundEffects />
      <CursorGlow />
      <Navbar />
      <main className=\"relative\">
        <Hero />
        <Stats />
        <Courses />
        <Testimonials />
        <Footer />
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

export default App;
"
Observation: Overwrite successful: /app/frontend/src/App.js