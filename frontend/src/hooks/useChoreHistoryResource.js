import { useEffect, useState } from 'react';
import { readChoreHistoryApi } from '../services/choreHistory';

export function useChoreHistoryResource(path) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!path) return;

    const controller = new AbortController();

    async function load() {
      try {
        const data = await readChoreHistoryApi(path, controller.signal);

        if (!controller.signal.aborted) {
          setResult({ path, attempt, data, error: '' });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setResult({
            path,
            attempt,
            data: null,
            error: error.message || 'Unable to load chore information.',
          });
        }
      }
    }

    load();

    return () => controller.abort();
  }, [path, attempt]);

  const current = result?.path === path && result?.attempt === attempt;

  return {
    data: current ? result.data : null,
    error: current ? result.error : '',
    loading: Boolean(path) && !current,
    retry: () => setAttempt((value) => value + 1),
  };
}
