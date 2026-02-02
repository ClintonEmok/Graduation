import { useCallback } from 'react';
import { logger } from '@/lib/logger';

export const useLogger = () => {
  const log = useCallback((type: string, payload?: any) => {
    logger.log(type, payload);
  }, []);

  return { log };
};
