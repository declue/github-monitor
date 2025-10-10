import packageJson from '../../package.json';

export const APP_VERSION = packageJson.version;
export const APP_NAME = packageJson.name;
export const ENVIRONMENT = import.meta.env.MODE || 'development';

export const getVersionInfo = () => ({
  version: APP_VERSION,
  name: APP_NAME,
  environment: ENVIRONMENT,
  buildDate: import.meta.env.VITE_BUILD_DATE || new Date().toISOString(),
});
