// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './live-counter';
import { mount } from './test-utils';

const BASE_TIME = Date.UTC(2026, 9, 1);

describe('<live-counter>', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME + 86_400_000);
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('renders the modelled total and keeps counting', () => {
    mount(`<live-counter data-base="1000000" data-base-time="2026-10-01T00:00:00Z" data-per-day="86400">1,000,000</live-counter>`);
    const el = document.querySelector('live-counter')!;
    expect(el.textContent).toBe('1,086,400');
    vi.advanceTimersByTime(3000);
    expect(el.textContent).toBe('1,086,403');
  });

  it('stops counting when removed', () => {
    mount(`<live-counter data-base="10" data-base-time="2026-10-01T00:00:00Z" data-per-day="86400"></live-counter>`);
    const el = document.querySelector('live-counter')!;
    el.remove();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rebases on live stats from the endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ordersVerified: 2_000_000 }) });
    vi.stubGlobal('fetch', fetchMock);
    mount(
      `<live-counter data-base="1000000" data-base-time="2026-10-01T00:00:00Z" data-per-day="86400" data-endpoint="/api/stats"></live-counter>`,
    );
    await vi.waitFor(() => expect(document.querySelector('live-counter')!.textContent).toBe('2,000,000'));
    expect(fetchMock).toHaveBeenCalledWith('/api/stats', expect.objectContaining({ headers: { Accept: 'application/json' } }));
  });

  it('keeps the model when the endpoint fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    mount(
      `<live-counter data-base="1000000" data-base-time="2026-10-01T00:00:00Z" data-per-day="86400" data-endpoint="/api/stats"></live-counter>`,
    );
    await Promise.resolve();
    expect(document.querySelector('live-counter')!.textContent).toBe('1,086,400');
  });
});
