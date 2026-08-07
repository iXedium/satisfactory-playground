const API_BASE = '/api/saves';

export interface SaveResult<T = void> {
  ok: boolean;
  error?: string;
  data?: T;
}

async function apiFetch(url: string, options?: RequestInit): Promise<{ ok: boolean; status: number; body: unknown }> {
  try {
    const res = await fetch(url, options);
    const body = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, body };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network error';
    throw new Error(message);
  }
}

function fail<T>(error: string): SaveResult<T> {
  return { ok: false, error };
}

function success<T>(data?: T): SaveResult<T> {
  return { ok: true, data };
}

export const saveService = {
  async getNames(): Promise<SaveResult<string[]>> {
    try {
      const result = await apiFetch(API_BASE);
      if (!result.ok && result.status !== 404) {
        const b = result.body as { error?: string } | null;
        return fail(b?.error || `Request failed (${result.status})`);
      }
      const b = result.body as { names?: string[] } | null;
      return success(b?.names || []);
    } catch (err: unknown) {
      return fail(err instanceof Error ? err.message : 'Network error');
    }
  },

  async get(name: string): Promise<SaveResult<string>> {
    try {
      const result = await apiFetch(`${API_BASE}/${encodeURIComponent(name)}`);
      if (!result.ok) {
        const b = result.body as { error?: string } | null;
        return fail(b?.error || `Request failed (${result.status})`);
      }
      const b = result.body as { state: string };
      return success(b.state);
    } catch (err: unknown) {
      return fail(err instanceof Error ? err.message : 'Network error');
    }
  },

  async save(name: string, state: string): Promise<SaveResult<void>> {
    try {
      const result = await apiFetch(
        `${API_BASE}/${encodeURIComponent(name)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state }),
        }
      );
      if (!result.ok) {
        const b = result.body as { error?: string } | null;
        return fail(b?.error || `Failed to save (${result.status})`);
      }
      return success();
    } catch (err: unknown) {
      return fail(err instanceof Error ? err.message : 'Network error');
    }
  },

  async delete(name: string): Promise<SaveResult<void>> {
    try {
      const result = await apiFetch(
        `${API_BASE}/${encodeURIComponent(name)}`,
        { method: 'DELETE' }
      );
      if (!result.ok) {
        const b = result.body as { error?: string } | null;
        return fail(b?.error || `Failed to delete (${result.status})`);
      }
      return success();
    } catch (err: unknown) {
      return fail(err instanceof Error ? err.message : 'Network error');
    }
  },

  async getActiveName(): Promise<SaveResult<string | null>> {
    try {
      const result = await apiFetch(`${API_BASE}/active`);
      if (!result.ok) {
        const b = result.body as { error?: string } | null;
        return fail(b?.error || `Request failed (${result.status})`);
      }
      const b = result.body as { name: string | null };
      return success(b.name);
    } catch (err: unknown) {
      return fail(err instanceof Error ? err.message : 'Network error');
    }
  },

  async setActiveName(name: string): Promise<SaveResult<void>> {
    try {
      const result = await apiFetch(`${API_BASE}/active`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!result.ok) {
        const b = result.body as { error?: string } | null;
        return fail(b?.error || `Failed to save active name (${result.status})`);
      }
      return success();
    } catch (err: unknown) {
      return fail(err instanceof Error ? err.message : 'Network error');
    }
  },

};
