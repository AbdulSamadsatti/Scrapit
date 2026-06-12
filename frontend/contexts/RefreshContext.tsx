import React, { createContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import { getBaseUrl } from '@/utils/getBaseUrl';

interface RefreshContextProps {
  refreshing: boolean;
  refreshAll: () => Promise<void>;
}

const RefreshContext = createContext<RefreshContextProps>({
  refreshing: false,
  refreshAll: async () => {},
});

export const RefreshProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [refreshing, setRefreshing] = useState(false);

  const refreshAll = useCallback(async () => {

    setRefreshing(true);
    try {
      const response = await fetch(`${getBaseUrl()}/api/refresh-all`);
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Refresh failed: ${err}`);
      }
      // No need to handle data here; components will refetch their own data.
    } catch (e) {
      console.error(e);
      Alert.alert('Refresh Error', (e as Error).message);
    } finally {

      setRefreshing(false);
    }
  }, []);



  return (
    <RefreshContext.Provider value={{ refreshing, refreshAll }}>
      {children}
    </RefreshContext.Provider>
  );
};

export default RefreshContext;
