import { Box } from '@mui/material';
import DOMPurify from 'dompurify';

interface HtmlSectionProps {
  html: string;
}

/**
 * Sanitized rendering of PVOG HTML section text. The only component
 * allowed to use dangerouslySetInnerHTML; input is always passed
 * through DOMPurify first.
 */
export function HtmlSection({ html }: HtmlSectionProps) {
  const sanitized = DOMPurify.sanitize(html);
  return (
    <Box
      sx={{
        '& p:first-of-type': { mt: 0 },
        '& p:last-of-type': { mb: 0 },
        fontSize: 14,
        lineHeight: 1.6,
        wordBreak: 'break-word',
      }}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
