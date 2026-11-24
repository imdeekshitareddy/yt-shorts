// Configuration manager for Google Sheets API & Pipeline
import fs from 'node:fs';
import path from 'node:path';

// Attempt to load .env file if it exists and process.loadEnvFile is supported
export function loadEnv(envPath) {
  try {
    if (!envPath) {
      const cwdEnv = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(cwdEnv)) {
        envPath = cwdEnv;
      } else {
        const pkgEnv = path.resolve(import.meta.dirname, '../.env');
        if (fs.existsSync(pkgEnv)) {
          envPath = pkgEnv;
        }
      }
    }
    if (envPath && fs.existsSync(envPath)) {
      if (typeof process.loadEnvFile === 'function') {
        process.loadEnvFile(envPath);
      } else {
        // Fallback simple line-by-line .env parser
        const content = fs.readFileSync(envPath, 'utf8');
        for (const line of content.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"](.*)['"]$/, '$1');
            if (key && process.env[key] === undefined) {
              process.env[key] = val;
            }
          }
        }
      }
    }
  } catch (err) {
    // Non-fatal if .env cannot be loaded
    console.warn('[CONFIG WARN] Could not load .env file:', err.message);
  }
}

// Automatically try to load .env on module import
loadEnv();

export function maskToken(token) {
  if (!token || typeof token !== 'string') return '[NOT SET]';
  if (token.length <= 4) return '****';
  return '***' + token.slice(-4);
}

export function getConfig(overrides = {}) {
  const apiUrl = overrides.apiUrl !== undefined ? overrides.apiUrl : process.env.APPS_SCRIPT_URL;
  const token = overrides.token !== undefined ? overrides.token : process.env.APPS_SCRIPT_TOKEN;
  const timeoutMs = +(overrides.timeoutMs !== undefined ? overrides.timeoutMs : (process.env.APPS_SCRIPT_TIMEOUT_MS || 25000));

  return {
    apiUrl: apiUrl ? apiUrl.trim() : '',
    token: token ? token.trim() : '',
    timeoutMs,
    isConfigured: Boolean(apiUrl && token),
    validate() {
      const missing = [];
      if (!this.apiUrl) missing.push('APPS_SCRIPT_URL');
      if (!this.token) missing.push('APPS_SCRIPT_TOKEN');
      if (missing.length > 0) {
        throw new Error(
          `Missing required environment variable(s): ${missing.join(', ')}. ` +
          `Please configure them in your .env file or environment.`
        );
      }
      return true;
    }
  };
}
