import { useState, useCallback, useRef, useMemo } from 'react';
import type { ApiState, ApiOptions } from '@/types';

const apiCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Default options to prevent recreation
const DEFAULT_OPTIONS: ApiOptions = {
  dedupe: true,
  cacheTtl: 30000,
  retries: 2
};

export const useApi = <T>(
  endpoint: string,
  options: ApiOptions = DEFAULT_OPTIONS
) => {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const retryCountRef = useRef(0);

  // Stabilize options to prevent unnecessary re-renders
  const stableOptions = useMemo(() => ({
    dedupe: options.dedupe ?? DEFAULT_OPTIONS.dedupe!,
    cacheTtl: options.cacheTtl ?? DEFAULT_OPTIONS.cacheTtl!,
    retries: options.retries ?? DEFAULT_OPTIONS.retries!,
  }), [options.dedupe, options.cacheTtl, options.retries]);

  const executeInternal = useCallback(async (body?: any, method = 'POST', retryCount = 0): Promise<any> => {
    // Check cache first
    if (stableOptions.dedupe && retryCount === 0) {
      const cacheKey = `${endpoint}-${JSON.stringify(body)}`;
      const cached = apiCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        setState(prev => ({ ...prev, data: cached.data, loading: false, error: null }));
        return cached.data;
      }
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const currentRequestId = ++requestIdRef.current;
    abortControllerRef.current = new AbortController();

    // Always set loading state and clear errors (including on retries)
    // This ensures skeleton stays visible during retries instead of showing errors
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      }, 30000); // 30 second timeout for cold starts

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        signal: abortControllerRef.current.signal,
      });

      clearTimeout(timeoutId);


      if (currentRequestId !== requestIdRef.current) return null;

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();

      // Cache the result
      if (stableOptions.dedupe && data.success) {
        const cacheKey = `${endpoint}-${JSON.stringify(body)}`;
        apiCache.set(cacheKey, {
          data: data.data || data,
          timestamp: Date.now(),
          ttl: stableOptions.cacheTtl,
        });
      }

      setState({ data: data.data || data, loading: false, error: null });
      return data.data || data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`❌ [useApi] ${endpoint} request timed out (attempt ${retryCount + 1})`);

        // Retry on timeout
        if (retryCount < stableOptions.retries) {
          const delay = Math.pow(2, retryCount) * 500; // 500ms, 1s, 2s
          console.log(`⏳ [useApi] Retrying ${endpoint} in ${delay}ms...`);
          // Keep loading state during retry - don't show error
          await new Promise(resolve => setTimeout(resolve, delay));
          return executeInternal(body, method, retryCount + 1);
        }

        // Only set error after all retries exhausted
        setState(prev => ({ ...prev, loading: false, error: 'Request timed out. Please try again.' }));
        return null;
      }

      const errorMessage = error instanceof Error ? error.message : 'Request failed';
      console.error(`❌ [useApi] ${endpoint} error (attempt ${retryCount + 1}):`, errorMessage);

      // Retry on HTTP errors (500, 404, etc)
      if (retryCount < stableOptions.retries) {
        const delay = Math.pow(2, retryCount) * 500; // 500ms, 1s, 2s
        console.log(`⏳ [useApi] Retrying ${endpoint} in ${delay}ms...`);
        // Keep loading state during retry - don't show error
        await new Promise(resolve => setTimeout(resolve, delay));
        return executeInternal(body, method, retryCount + 1);
      }

      // Only set error after all retries exhausted
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      throw error;
    }
  }, [endpoint, stableOptions]);

  const execute = useCallback(async (body?: any, method = 'POST') => {
    return executeInternal(body, method, 0);
  }, [executeInternal]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return { ...state, execute, reset };
};