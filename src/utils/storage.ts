import { getConfiguration, updateGitHubConfig, resetConfiguration } from '../api/config';

export interface Settings {
  token: string;
  orgs: string[];
  githubApiUrl?: string;
}

/**
 * Save settings to backend configuration file
 */
export const saveSettings = async (settings: Settings): Promise<void> => {
  try {
    // Join all organizations with comma for backend
    const organization = settings.orgs && settings.orgs.length > 0 ? settings.orgs.join(',') : undefined;

    await updateGitHubConfig(
      settings.token,
      settings.githubApiUrl || 'https://api.github.com',
      organization
    );

    // Also save to localStorage as a fallback/cache
    localStorage.setItem('github_explorer_settings', JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings to backend:', error);
    // Fallback to localStorage
    localStorage.setItem('github_explorer_settings', JSON.stringify(settings));
  }
};

/**
 * Load settings from backend configuration file
 */
export const loadSettings = async (): Promise<Settings | null> => {
  try {
    // Try to load from backend first
    const config = await getConfiguration();

    // Check if config has github property (not just if token exists)
    if (config && config.github) {
      // Convert backend format to frontend format
      // Parse comma-separated organizations
      let orgs: string[] = [];
      if (config.github.organization) {
        orgs = config.github.organization.split(',').map((org: string) => org.trim()).filter((org: string) => org.length > 0);
      }

      const settings: Settings = {
        token: config.github.token || '',
        orgs: orgs,
        githubApiUrl: config.github.api_url || 'https://api.github.com',
      };

      // Only return settings if token exists
      if (settings.token) {
        // Cache in localStorage
        localStorage.setItem('github_explorer_settings', JSON.stringify(settings));
        return settings;
      }
    }

    // Fallback to localStorage if backend doesn't have settings
    const stored = localStorage.getItem('github_explorer_settings');
    if (stored) {
      const settings = JSON.parse(stored);

      // If localStorage has settings but backend doesn't, save to backend
      if (settings.token) {
        await saveSettings(settings);
      }

      return {
        ...settings,
        githubApiUrl: settings.githubApiUrl || 'https://api.github.com'
      };
    }
  } catch (error) {
    console.error('Failed to load settings from backend:', error);

    // Fallback to localStorage
    try {
      const stored = localStorage.getItem('github_explorer_settings');
      if (stored) {
        const settings = JSON.parse(stored);
        return {
          ...settings,
          githubApiUrl: settings.githubApiUrl || 'https://api.github.com'
        };
      }
    } catch (localError) {
      console.error('Failed to load settings from localStorage:', localError);
    }
  }

  return null;
};

/**
 * Synchronous version for immediate loading (uses cached localStorage)
 */
export const loadSettingsSync = (): Settings | null => {
  try {
    const stored = localStorage.getItem('github_explorer_settings');
    if (stored) {
      const settings = JSON.parse(stored);
      return {
        ...settings,
        githubApiUrl: settings.githubApiUrl || 'https://api.github.com'
      };
    }
  } catch (error) {
    console.error('Failed to load cached settings:', error);
  }
  return null;
};

/**
 * Clear settings from both backend and localStorage
 */
export const clearSettings = async (): Promise<void> => {
  try {
    await resetConfiguration();
    localStorage.removeItem('github_explorer_settings');
  } catch (error) {
    console.error('Failed to clear settings:', error);
    localStorage.removeItem('github_explorer_settings');
  }
};
