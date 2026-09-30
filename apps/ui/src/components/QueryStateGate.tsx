import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
} from '@mui/material';
import { UseQueryResult } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { ApiError } from '../api/ApiError';

interface QueryStateGateProps<T> {
  query: UseQueryResult<T>;
  /**
   * Marks the loaded data as empty → explicit empty state.
   */
  isEmpty?: (data: T) => boolean;
  emptyMessage?: string;
  /**
   * Shown while the query is disabled (required params missing).
   */
  idleMessage?: string;
  /**
   * Custom rendering for 404 (defaults to an inline warning alert).
   */
  renderNotFound?: (error: ApiError) => ReactNode;
  children: (data: T) => ReactNode;
}

/**
 * Wrapper for every query-driven area: idle hint, spinner, error with
 * retry, 404 inline state, explicit empty state.
 * 400 validation errors render nothing here — the owning form shows them.
 */
export function QueryStateGate<T>({
  query,
  isEmpty,
  emptyMessage = 'No results for this query.',
  idleMessage,
  renderNotFound,
  children,
}: QueryStateGateProps<T>) {
  if (query.isPending && query.fetchStatus === 'idle') {
    return idleMessage ? (
      <Typography variant="body2" color="text.secondary">
        {idleMessage}
      </Typography>
    ) : null;
  }

  if (query.isPending) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (query.isError) {
    const error = query.error;
    if (error instanceof ApiError && error.status === 400) {
      return null;
    }
    if (error instanceof ApiError && error.status === 404) {
      return renderNotFound ? (
        <>{renderNotFound(error)}</>
      ) : (
        <Alert severity="warning">{error.message}</Alert>
      );
    }
    return (
      <Alert
        severity="error"
        action={
          <Button
            color="inherit"
            size="small"
            onClick={() => void query.refetch()}
          >
            Retry
          </Button>
        }
      >
        {error.message}
      </Alert>
    );
  }

  if (isEmpty?.(query.data)) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyMessage}
      </Typography>
    );
  }

  return <>{children(query.data)}</>;
}
