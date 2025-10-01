import { useState, useCallback, useRef } from 'react';
import type { ApiState, ApiOptions } from '@/types';

const apiCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export const useApi = <T>(
  endpoint: string,
  options: ApiOptions = { dedupe: true, cacheTtl: 30000 }
) => {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const execute = useCallback(async (body?: any, method = 'POST') => {
    // Check cache first
    if (options.dedupe) {
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

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      }, 15000); // 15 second timeout

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
      if (options.dedupe && data.success) {
        const cacheKey = `${endpoint}-${JSON.stringify(body)}`;
        apiCache.set(cacheKey, {
          data: data.data || data,
          timestamp: Date.now(),
          ttl: options.cacheTtl!,
        });
      }

      setState({ data: data.data || data, loading: false, error: null });
      return data.data || data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`❌ [useApi] ${endpoint} request timed out`);
        setState(prev => ({ ...prev, loading: false, error: 'Request timed out. Please try again.' }));
        return null;
      }

      const errorMessage = error instanceof Error ? error.message : 'Request failed';
      console.error(`❌ [useApi] ${endpoint} error:`, errorMessage);
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      throw error;
    }
  }, [endpoint, options.dedupe, options.cacheTtl]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return { ...state, execute, reset };
};