import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { populateDexie } from "../data/dexieInit";
import { injectThemeVariables } from '../styles/theme';
import { logger } from '../utils/logger';

interface InitializationContextState {
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
}

const InitializationContext = createContext<InitializationContextState | undefined>(undefined);

interface InitializationProviderProps {
  children: ReactNode;
}

export const InitializationProvider: React.FC<InitializationProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      setIsLoading(true);
      setIsError(false);
      setErrorMessage(null);
      try {
        injectThemeVariables();
        await populateDexie();
        setIsLoading(false);
      } catch (error: unknown) {
        logger.error("Failed to initialize application:", error);
        const message = error instanceof Error ? error.message : "Unknown error initializing the application";
        setErrorMessage(message);
        setIsError(true);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  const value = {
    isLoading,
    isError,
    errorMessage,
  };

  return (
    <InitializationContext.Provider value={value}>
      {children}
    </InitializationContext.Provider>
  );
};

export const useInitialization = (): InitializationContextState => {
  const context = useContext(InitializationContext);
  if (context === undefined) {
    throw new Error('useInitialization must be used within an InitializationProvider');
  }
  return context;
}; 