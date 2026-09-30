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
 * only the languages.
 */
export function ServiceMetadataList({
  service,
  dense = false,
}: ServiceMetadataListProps) {
  const groups: { title: string; chips: ReactNode[] }[] = [
    {
      title: 'Target audiences',
      chips: service.targetAudiences.map((audience) => (
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
      chips: service.federalStateKeys.map((key) => (
        <KeyChip key={key} value={key} />
      )),
    },
  ].filter((group) => group.chips.length > 0);

  if (groups.length === 0) {
    return null;
  }

  return (
    <Stack
      direction={dense ? 'column' : 'row'}
      spacing={dense ? 1 : 4}
      flexWrap="wrap"
      useFlexGap
    >
      {groups.map((group) => (
        <Box key={group.title}>
          <Typography
            variant={dense ? 'caption' : 'subtitle2'}
            color={dense ? 'text.secondary' : undefined}
            component="div"
            gutterBottom={!dense}
          >
            {group.title}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {group.chips}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
