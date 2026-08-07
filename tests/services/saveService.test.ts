import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveService } from '../../src/services/saveService';

describe('saveService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mockFetch(status: number, body: unknown) {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    } as Response);
  }

  function mockFetchReject(message: string) {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error(message));
  }

  describe('isAvailable', () => {
    it('returns true when API responds successfully', async () => {
      mockFetch(200, { names: [] });
      const result = await saveService.isAvailable();
      expect(result).toBe(true);
    });

    it('returns false on network error', async () => {
      mockFetchReject('Connection refused');
      const result = await saveService.isAvailable();
      expect(result).toBe(false);
    });
  });

  describe('getNames', () => {
    it('returns list of names', async () => {
      mockFetch(200, { names: ['Setup A', 'Setup B'] });
      const result = await saveService.getNames();
      expect(result.ok).toBe(true);
      expect(result.data).toEqual(['Setup A', 'Setup B']);
    });

    it('returns empty list when no saves exist', async () => {
      mockFetch(200, { names: [] });
      const result = await saveService.getNames();
      expect(result.ok).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('returns error on network failure', async () => {
      mockFetchReject('Network down');
      const result = await saveService.getNames();
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Network down');
    });
  });

  describe('get', () => {
    it('returns the setup state', async () => {
      mockFetch(200, { name: 'Setup1', state: '{"test":true}' });
      const result = await saveService.get('Setup1');
      expect(result.ok).toBe(true);
      expect(result.data).toBe('{"test":true}');
    });

    it('returns error for 404', async () => {
      mockFetch(404, { error: 'Setup "bad" not found' });
      const result = await saveService.get('bad');
      expect(result.ok).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('save', () => {
    it('saves successfully', async () => {
      mockFetch(200, { ok: true, name: 'New' });
      const result = await saveService.save('New', '{"x":1}');
      expect(result.ok).toBe(true);
    });

    it('returns error on failure', async () => {
      mockFetch(500, { error: 'Disk full' });
      const result = await saveService.save('Bad', 'data');
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Disk full');
    });
  });

  describe('delete', () => {
    it('deletes successfully', async () => {
      mockFetch(200, { ok: true });
      const result = await saveService.delete('Setup1');
      expect(result.ok).toBe(true);
    });

    it('returns error for 404', async () => {
      mockFetch(404, { error: 'Setup "bad" not found' });
      const result = await saveService.delete('bad');
      expect(result.ok).toBe(false);
    });
  });

  describe('getActiveName', () => {
    it('returns the active name', async () => {
      mockFetch(200, { name: 'My Setup' });
      const result = await saveService.getActiveName();
      expect(result.ok).toBe(true);
      expect(result.data).toBe('My Setup');
    });

    it('returns null when no active name', async () => {
      mockFetch(200, { name: null });
      const result = await saveService.getActiveName();
      expect(result.ok).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('setActiveName', () => {
    it('sets the active name', async () => {
      mockFetch(200, { ok: true });
      const result = await saveService.setActiveName('My Setup');
      expect(result.ok).toBe(true);
    });

    it('returns error on failure', async () => {
      mockFetch(500, { error: 'Server error' });
      const result = await saveService.setActiveName('Bad');
      expect(result.ok).toBe(false);
    });
  });

  describe('migrateFromLocalStorage', () => {
    it('migrates setups from localStorage to API', async () => {
      const setups = { 'Setup1': { test: 1 }, 'Setup2': { test: 2 } };
      vi.spyOn(localStorage, 'getItem').mockImplementation((key: string) => {
        if (key === 'plannerSetups') return JSON.stringify(setups);
        if (key === 'plannerLastActiveSetupName') return 'Setup1';
        return null;
      });

      mockFetch(200, { ok: true, name: 'Setup1' });

      const result = await saveService.migrateFromLocalStorage();
      expect(result.migrated).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('does nothing when localStorage is empty', async () => {
      vi.spyOn(localStorage, 'getItem').mockReturnValue(null);
      const result = await saveService.migrateFromLocalStorage();
      expect(result.migrated).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });
});
