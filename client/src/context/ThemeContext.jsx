import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const mediaQuery = window.matchMedia(
    "(prefers-color-scheme: dark)"
  );

  const [theme, setTheme] = useState(
    mediaQuery.matches ? "dark" : "light"
  );

  useEffect(() => {
    const updateTheme = (e) => {
      setTheme(e.matches ? "dark" : "light");
    };

    document.documentElement.setAttribute(
      "data-theme",
      theme
    );

    mediaQuery.addEventListener("change", updateTheme);

    return () => {
      mediaQuery.removeEventListener(
        "change",
        updateTheme
      );
    };
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);