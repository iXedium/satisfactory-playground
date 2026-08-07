import { describe, it, expect, beforeEach } from 'vitest';

process.env.SAVES_DB_PATH = ':memory:';

import {
  getAllSetupNames,
  getSetup,
  saveSetup,
  deleteSetup,
  getMeta,
  setMeta,
  closeDb,
} from '../../server/database';

describe('Save Database', () => {
  beforeEach(() => {
    process.env.SAVES_DB_PATH = ':memory:';
    closeDb();
  });
  it('starts with an empty setup list', () => {
    const names = getAllSetupNames();
    expect(names).toEqual([]);
  });

  it('saves and retrieves a setup', () => {
    saveSetup('My Factory', JSON.stringify({ test: true }));
    const names = getAllSetupNames();
    expect(names).toEqual(['My Factory']);

    const state = getSetup('My Factory');
    expect(state).toBe(JSON.stringify({ test: true }));
  });

  it('returns null for non-existent setup', () => {
    const state = getSetup('nonexistent');
    expect(state).toBeNull();
  });

  it('overwrites an existing setup', () => {
    saveSetup('Setup1', 'v1');
    saveSetup('Setup1', 'v2');
    expect(getSetup('Setup1')).toBe('v2');
    expect(getAllSetupNames()).toEqual(['Setup1']);
  });

  it('deletes a setup', () => {
    saveSetup('Setup1', 'data');
    expect(deleteSetup('Setup1')).toBe(true);
    expect(getAllSetupNames()).toEqual([]);
    expect(getSetup('Setup1')).toBeNull();
  });

  it('returns false when deleting non-existent setup', () => {
    expect(deleteSetup('nonexistent')).toBe(false);
  });

  it('stores and retrieves meta values', () => {
    expect(getMeta('someKey')).toBeNull();
    setMeta('someKey', 'someValue');
    expect(getMeta('someKey')).toBe('someValue');
    setMeta('someKey', 'updated');
    expect(getMeta('someKey')).toBe('updated');
  });

  it('returns setup names sorted alphabetically', () => {
    saveSetup('C', 'c');
    saveSetup('A', 'a');
    saveSetup('B', 'b');
    expect(getAllSetupNames()).toEqual(['A', 'B', 'C']);
  });
});
