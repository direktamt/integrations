import { Stack } from '@mui/material';
import { ReactNode } from 'react';

interface FormRowProps {
  children: ReactNode;
}

/**
 * Responsive row of form fields and the submit button: stacked on small
 * screens, wrapping and top-aligned (helper texts) from `md`.
 */
export function FormRow({ children }: FormRowProps) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      useFlexGap
      sx={{ flexWrap: 'wrap', alignItems: { md: 'flex-start' } }}
    >
      {children}
    </Stack>
  );
}
