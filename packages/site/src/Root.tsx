import type { FunctionComponent, ReactNode } from 'react';
import { createContext, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider } from 'styled-components';

import { dark, light } from './config/theme';
import { MetaMaskProvider } from './hooks';
import { getThemePreference, setLocalStorage } from './utils';

export type RootProps = {
  children: ReactNode;
};

type ToggleTheme = () => void;

export const ToggleThemeContext = createContext<ToggleTheme>(
  (): void => undefined,
);

export const Root: FunctionComponent<RootProps> = ({ children }) => {
  const [darkTheme, setDarkTheme] = useState(getThemePreference());
  const queryClient = useMemo(() => new QueryClient(), []);

  const toggleTheme: ToggleTheme = () => {
    setLocalStorage('theme', darkTheme ? 'light' : 'dark');
    setDarkTheme(!darkTheme);
  };

  return (
    <ToggleThemeContext.Provider value={toggleTheme}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={darkTheme ? dark : light}>
          <MetaMaskProvider>{children}</MetaMaskProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ToggleThemeContext.Provider>
  );
};
