import { DirektAmtThemeProvider } from '@direktamt/ui-kit';
import '@direktamt/ui-kit/fonts';
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { ApiError } from './api/ApiError';
import { App } from './App';
import { RouterLinkBehavior } from './components/RouterLinkBehavior';
import { showErrorSnackbar } from './components/ErrorSnackbar';
import { applyFavicon } from './Favicon';

applyFavicon();

/**
 * Global error routing: 400 and 404 are handled inline by
 * the pages; everything else surfaces in the global snackbar.
 */
function onQueryError(error: Error): void {
  if (error instanceof ApiError) {
    if (error.status === 400 || error.status === 404) {
      return;
    }
    if (error.status === 502) {
      showErrorSnackbar('Government data source is unavailable.');
      return;
    }
    if (error.status === 504) {
      showErrorSnackbar('Government data source timed out.');
      return;
    }
  }
  showErrorSnackbar(error.message);
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: onQueryError }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DirektAmtThemeProvider linkComponent={RouterLinkBehavior}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </DirektAmtThemeProvider>
  </StrictMode>,
);
