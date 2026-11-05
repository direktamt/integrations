import type { PublicServiceDescription } from '@direktamt/integrations-contracts';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';
import { KeyChip } from '../../components/KeyChip';

interface ServiceMetadataListProps {
  service: PublicServiceDescription;
  /**
   * Table-cell layout: caption labels and tighter spacing.
   */
  dense?: boolean;
}

/**
 * Compact publication metadata of a service description: target audiences,
 * available languages and federal states. A group without values is not
 * rendered; the search endpoint publishes all three, the detail endpoint
 * only the languages (the other two are absent there).
 */
export function ServiceMetadataList({
  service,
  dense = false,
}: ServiceMetadataListProps) {
  const groups: { title: string; chips: ReactNode[] }[] = [
    {
      title: 'Target audiences',
      chips: (service.targetAudiences ?? []).map((audience) => (
        <Chip key={audience} label={audience} size="small" />
      )),
    },
    {
      title: 'Languages',
      chips: service.availableLanguages.map((language) => (
        <Chip key={language} label={language} size="small" />
      )),
    },
    {
      title: 'Federal states',
      chips: (service.federalStateKeys ?? []).map((key) => (
        <KeyChip key={key} value={key} />
      )),
    },
  ].filter((group) => group.chips.length > 0);

  if (groups.length === 0) {
    return null;
  }

  return (
    <Stack
      direction="row"
      useFlexGap
      sx={{
        flexWrap: 'wrap',
        columnGap: dense ? 2.5 : 4,
        rowGap: dense ? 1.5 : 2,
      }}
    >
      {groups.map((group) => (
        <Box key={group.title}>
          <Typography
            variant="caption"
            component="div"
            sx={{
              color: 'text.secondary',
              fontWeight: 600,
              marginBottom: 0.75,
            }}
          >
            {group.title}
          </Typography>
          <Stack
            direction="row"
            spacing={0.75}
            useFlexGap
            sx={{ flexWrap: 'wrap' }}
          >
            {group.chips}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
