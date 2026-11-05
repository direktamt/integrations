import { EmptyState, LoadingState } from '@direktamt/ui-kit';
import SearchIcon from '@mui/icons-material/Search';
import { Button } from '@mui/material';
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
   * Custom rendering for 404 (defaults to an inline not-found state).
   */
  renderNotFound?: (error: ApiError) => ReactNode;
  /**
   * Compact states for nested regions (cards, dialogs).
   */
  dense?: boolean;
  children: (data: T) => ReactNode;
}

/**
 * Wrapper for every query-driven area: idle hint, loading state, error with
 * retry, 404 inline state, explicit empty state.
 * 400 validation errors render nothing here — the owning form shows them.
 */
export function QueryStateGate<T>({
  query,
  isEmpty,
  emptyMessage = 'No results for this query.',
  idleMessage,
  renderNotFound,
  dense = false,
  children,
}: QueryStateGateProps<T>) {
  if (query.isPending && query.fetchStatus === 'idle') {
    return idleMessage ? (
      <EmptyState
        icon={<SearchIcon />}
        title="Nothing requested yet"
        description={idleMessage}
        dense={dense}
      />
    ) : null;
  }

  if (query.isPending) {
    return <LoadingState dense={dense} />;
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
        <EmptyState
          tone="warning"
          title="Not found"
          description={error.message}
          dense={dense}
        />
      );
    }
    return (
      <EmptyState
        tone="error"
        title="The request failed"
        description={error.message}
        dense={dense}
        action={
          <Button
            variant="outlined"
            color="inherit"
            size="small"
            onClick={() => void query.refetch()}
          >
            Retry
          </Button>
        }
      />
    );
  }

  if (isEmpty?.(query.data)) {
    return (
      <EmptyState title="No results" description={emptyMessage} dense={dense} />
    );
  }

  return <>{children(query.data)}</>;
}
