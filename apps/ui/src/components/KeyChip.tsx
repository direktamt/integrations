import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Chip, Tooltip } from '@mui/material';
import { useState, type MouseEvent } from 'react';

interface KeyChipProps {
  value: string;
}

/**
 * Monospace chip for official keys (ARS, LeiKa) with copy-to-clipboard.
 */
export function KeyChip({ value }: KeyChipProps) {
  const [copied, setCopied] = useState(false);

  const copy = (event: MouseEvent) => {
    event.stopPropagation();
    void navigator.clipboard.writeText(value);
    setCopied(true);
  };

  return (
    <Tooltip
      title={copied ? 'Copied' : 'Copy'}
      onClose={() => setCopied(false)}
    >
      <Chip
        label={value}
        size="small"
        icon={copied ? <CheckIcon /> : <ContentCopyIcon />}
        onClick={copy}
        aria-label={`Copy ${value}`}
        sx={{
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          fontWeight: 500,
          '& .MuiChip-icon': { fontSize: 14, marginInlineStart: '6px' },
        }}
      />
    </Tooltip>
  );
}
