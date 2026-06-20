import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTimer } from '../use-timer';

describe('useTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useTimer(25 * 60)); // 25 minutes

    expect(result.current.time).toBe(25 * 60);
    expect(result.current.isRunning).toBe(false);
  });

  it('should start and count down when start is called', () => {
    const { result } = renderHook(() => useTimer(10));

    act(() => {
      result.current.start();
    });

    expect(result.current.isRunning).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.time).toBe(9);
  });

  it('should pause timer', () => {
    const { result } = renderHook(() => useTimer(10));

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    act(() => {
      result.current.pause();
    });

    expect(result.current.isRunning).toBe(false);
    expect(result.current.time).toBe(7);
  });

  it('should reset timer to initial value', () => {
    const { result } = renderHook(() => useTimer(10));

    act(() => {
      result.current.start();
      vi.advanceTimersByTime(5000);
      result.current.reset();
    });

    expect(result.current.time).toBe(10);
    expect(result.current.isRunning).toBe(false);
  });
});
