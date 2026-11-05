import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { ReactNode } from 'react';

export interface DataTableColumn<T> {
  header: string;
  render: (row: T) => ReactNode;
  width?: string | number;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  /**
   * Summary line above the table, e.g. the result count.
   */
  caption?: ReactNode;
  footer?: ReactNode;
}

/**
 * Generic MUI table driven by a columns config, on a bordered surface.
 * Loading/error/empty states are handled outside via QueryStateGate.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  caption,
  footer,
}: DataTableProps<T>) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      {caption && (
        <Box
          sx={{
            paddingInline: 2,
            paddingBlock: 1.25,
            borderBottom: '1px solid',
            borderColor: 'border.subtle',
            typography: 'body2',
            color: 'text.secondary',
          }}
        >
          {caption}
        </Box>
      )}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column.header} sx={{ width: column.width }}>
                  {column.header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow
                key={getRowKey(row, index)}
                hover={Boolean(onRowClick)}
                onClick={() => onRowClick?.(row)}
                sx={
                  onRowClick
                    ? { cursor: 'pointer', verticalAlign: 'top' }
                    : { verticalAlign: 'top' }
                }
              >
                {columns.map((column) => (
                  <TableCell key={column.header}>
                    {column.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {footer}
    </Paper>
  );
}
