const STORAGE_KEY = 'github_explorer_settings';

export interface Settings {
  token: string;
  orgs: string[];
  githubApiUrl?: string;
}

export const saveSettings = (settings: Settings): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
};

export const loadSettings = (): Settings | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const settings = JSON.parse(stored);
      // Provide default value for githubApiUrl if not set
      return {
        ...settings,
        githubApiUrl: settings.githubApiUrl || 'https://api.github.com'
      };
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  return null;
};

export const clearSettings = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear settings:', error);
  }
};
