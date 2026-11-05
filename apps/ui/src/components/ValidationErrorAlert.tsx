import { Alert, AlertTitle } from '@mui/material';
import { ApiError } from '../api/ApiError';

interface ValidationErrorAlertProps {
  error: Error | null;
}

/**
 * Inline rendering of integrations API 400 validation messages on a form.
 * Renders nothing for other errors (handled by QueryStateGate/snackbar).
 */
export function ValidationErrorAlert({ error }: ValidationErrorAlertProps) {
  if (!(error instanceof ApiError) || error.status !== 400) {
    return null;
  }
  return (
    <Alert severity="warning" sx={{ mt: 2 }}>
      <AlertTitle>The API rejected the request</AlertTitle>
      {error.details.map((detail) => (
        <div key={detail}>{detail}</div>
      ))}
    </Alert>
  );
}
