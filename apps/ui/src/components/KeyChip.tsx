import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Chip, Tooltip } from '@mui/material';
import { useState } from 'react';

interface KeyChipProps {
  value: string;
}

/**
 * Monospace chip for official keys (ARS, LeiKa) with copy-to-clipboard.
 */
export function KeyChip({ value }: KeyChipProps) {
  const [copied, setCopied] = useState(false);

  const copy = (event: React.MouseEvent) => {
    event.stopPropagation();
    void navigator.clipboard.writeText(value);
    setCopied(true);
  };

  return (
    <Tooltip
      title={copied ? 'Copied' : 'Copy'}
      onClose={() => setCopied(false)}
    >
      <Chip label={value} icon={<ContentCopyIcon />} onClick={copy} />
    </Tooltip>
  );
}
