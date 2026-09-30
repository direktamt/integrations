import { Alert, Snackbar } from '@mui/material';
import { useEffect, useState } from 'react';

type ErrorListener = (message: string) => void;

let activeListener: ErrorListener | null = null;

/**
 * Pushes a message to the globally mounted ErrorSnackbar host.
 * Called from the React Query global error handler.
 */
export function showErrorSnackbar(message: string): void {
  activeListener?.(message);
}

/**
 * Global error surface: a single Snackbar + Alert host mounted once
 * in the app shell.
 */
export function ErrorSnackbar() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    activeListener = setMessage;
    return () => {
      activeListener = null;
    };
  }, []);

  return (
    <Snackbar
      open={message !== null}
      autoHideDuration={6000}
      onClose={() => setMessage(null)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert severity="error" variant="filled" onClose={() => setMessage(null)}>
        {message}
      </Alert>
    </Snackbar>
  );
}
