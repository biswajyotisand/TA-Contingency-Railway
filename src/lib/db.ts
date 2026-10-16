/**
 * Database API Adapter for TA Junction
 * Supports local offline/demo mode and seamless connection to remote Database APIs
 * (Supabase, Firebase, PostgreSQL REST, Express/Node, MongoDB Atlas, or Custom REST).
 */

export interface DatabaseConfig {
  provider: 'local' | 'custom-rest' | 'supabase' | 'firebase' | 'postgresql';
  apiUrl: string;
  apiKey: string;
  connected: boolean;
  lastTested?: string;
}

const DB_CONFIG_KEY = 'ta_junction_db_config';

export function getDatabaseConfig(): DatabaseConfig {
  try {
    const raw = localStorage.getItem(DB_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }

  // Check Vite env
  const envUrl = (import.meta as any).env?.VITE_DATABASE_API_URL || '';
  const envKey = (import.meta as any).env?.VITE_DATABASE_API_KEY || '';

  return {
    provider: envUrl ? 'custom-rest' : 'local',
    apiUrl: envUrl,
    apiKey: envKey,
    connected: false,
  };
}

export function saveDatabaseConfig(config: DatabaseConfig): void {
  localStorage.setItem(DB_CONFIG_KEY, JSON.stringify(config));
}

export async function testDatabaseApi(config: DatabaseConfig): Promise<{ success: boolean; message: string }> {
  if (config.provider === 'local' || !config.apiUrl) {
    return { success: true, message: 'Local storage mode active. No remote database configured yet.' };
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
      headers['apikey'] = config.apiKey;
    }

    const res = await fetch(`${config.apiUrl.replace(/\/$/, '')}/health`, {
      method: 'GET',
      headers,
    });

    if (res.ok) {
      return { success: true, message: `Successfully connected to database endpoint (${res.status} OK)` };
    } else {
      return { success: false, message: `Endpoint returned HTTP ${res.status}: ${res.statusText}` };
    }
  } catch (err: any) {
    return { success: false, message: `Connection error: ${err.message || 'Failed to fetch endpoint'}` };
  }
}
