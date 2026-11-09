import { useState, useEffect, useCallback, useRef } from 'react';
import { errMsg } from '../services/api';

export default function useFetch(requestFn, deps = []) {
  const requestSeq = useRef(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(() => {
    const currentId = ++requestSeq.current;
    setLoading(true);
    setError(null);

    return requestFn()
      .then((response) => {
        if (currentId === requestSeq.current) {
          setData(response.data);
        }
      })
      .catch((err) => {
        if (currentId === requestSeq.current) {
          setError(errMsg(err));
        }
      })
      .finally(() => {
        if (currentId === requestSeq.current) {
          setLoading(false);
        }
      });
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return {
    data,
    setData,
    loading,
    error,
    reload: load,
  };
}
