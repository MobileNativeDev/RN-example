import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import NetInfo from '@react-native-community/netinfo';

type NetworkContextType = {
  isOnline: boolean;
};

const NetworkContext = createContext<NetworkContextType>({
  isOnline: true,
});

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(!!state.isConnected);
    });

    return unsubscribe;
  }, []);

  const value = useMemo(() => ({ isOnline }), [isOnline]);

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);
