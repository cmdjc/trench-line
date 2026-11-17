import { describe, expect, it, vi } from 'vitest';
import { bus } from '../../src/core/events.js';

describe('bus', () => {
  it('delivers payloads to listeners', () => {
    const seen = [];
    bus.on('toast', m => seen.push(m));
    bus.emit('toast', 'hello');
    expect(seen).toEqual(['hello']);
  });
  it('off removes the listener', () => {
    const fn = vi.fn();
    const off = bus.on('x', fn);
    off();
    bus.emit('x', 1);
    expect(fn).not.toHaveBeenCalled();
  });
  it('emit with no listeners does not throw', () => {
    expect(() => bus.emit('nobody-home', 1)).not.toThrow();
  });
  it('does not fire listeners added after the emit', () => {
    const fn = vi.fn();
    bus.emit('late', 1);
    bus.on('late', fn);
    expect(fn).not.toHaveBeenCalled();
  });
  it('listener removal during emit is safe', () => {
    const seen = [];
    const offA = bus.on('chain', () => { seen.push('a'); offA(); });
    bus.on('chain', () => seen.push('b'));
    bus.emit('chain');
    expect(seen).toEqual(['a', 'b']);
  });
});
