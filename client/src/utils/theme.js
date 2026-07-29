export const THEME_STORAGE_KEY = "pingme-theme";

const systemThemeQuery = window.matchMedia(
  "(prefers-color-scheme: dark)"
);

const isValidTheme = (theme) =>
  ["system", "light", "dark"].includes(theme);

export const getSavedTheme = () => {
  const savedTheme = localStorage.getItem(
    THEME_STORAGE_KEY
  );

  return isValidTheme(savedTheme)
    ? savedTheme
    : "system";
};

export const getSystemTheme = () =>
  systemThemeQuery.matches
    ? "dark"
    : "light";

const updateDocumentTheme = () => {
  const preference = getSavedTheme();

  const resolvedTheme =
    preference === "system"
      ? getSystemTheme()
      : preference;

  const root = document.documentElement;

  root.dataset.theme = resolvedTheme;
  root.dataset.themePreference = preference;

  root.style.colorScheme = resolvedTheme;
};

export const applyTheme = (theme) => {
  const safeTheme = isValidTheme(theme)
    ? theme
    : "system";

  localStorage.setItem(
    THEME_STORAGE_KEY,
    safeTheme
  );

  updateDocumentTheme();
};

export const initializeTheme = () => {
  updateDocumentTheme();

  const handleSystemThemeChange = () => {
    if (getSavedTheme() === "system") {
      updateDocumentTheme();
    }
  };

  systemThemeQuery.addEventListener(
    "change",
    handleSystemThemeChange
  );
};