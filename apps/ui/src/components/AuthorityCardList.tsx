import {
  AuthorityContactType,
  type AuthorityAddress,
  type AuthorityContact,
  type AuthorityRole,
  type PublicAuthority,
} from '@direktamt/integrations-contracts';
import { Box, Chip, Link, Paper, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';
import { KeyChip } from './KeyChip';

export interface AuthorityCardItem {
  authority: PublicAuthority;
  /**
   * Roles the authority plays in the relation it was resolved through.
   */
  roles: AuthorityRole[];
}

interface AuthorityCardListProps {
  items: AuthorityCardItem[];
}

/**
 * Authorities of a relation (service or online service): name, roles,
 * official id, and the published addresses, contact channels and websites.
 * Absent upstream data is shown as absent.
 */
export function AuthorityCardList({ items }: AuthorityCardListProps) {
  return (
    <Stack spacing={2}>
      {items.map(({ authority, roles }) => (
        <Paper
          key={authority.id}
          variant="outlined"
          sx={{ borderRadius: 3, padding: { xs: 2, sm: 2.5 } }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{
              justifyContent: 'space-between',
              alignItems: { sm: 'flex-start' },
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" component="h3">
                {authority.name ?? '(unnamed)'}
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{ flexWrap: 'wrap', marginTop: 1 }}
              >
                {roles.map((role) => (
                  <Chip
                    key={role}
                    label={role}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Box>
            <KeyChip value={authority.id} />
          </Stack>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(3, minmax(0, 1fr))',
              },
              gap: { xs: 2, md: 3 },
              marginTop: 2.5,
              paddingTop: 2,
              borderTop: '1px solid',
              borderColor: 'border.subtle',
            }}
          >
            <AuthorityDetailBlock
              title="Addresses"
              empty={!authority.addresses.length}
            >
              {authority.addresses.map((address, index) => (
                <DetailEntry
                  key={index}
                  primary={formatAddress(address)}
                  secondary={address.type}
                />
              ))}
            </AuthorityDetailBlock>
            <AuthorityDetailBlock
              title="Contacts"
              empty={!authority.contacts.length}
            >
              {authority.contacts.map((contact, index) => (
                <DetailEntry
                  key={index}
                  primary={renderContactValue(contact)}
                  secondary={[contact.type, contact.label, contact.description]
                    .filter(Boolean)
                    .join(' · ')}
                />
              ))}
            </AuthorityDetailBlock>
            <AuthorityDetailBlock
              title="Websites"
              empty={!authority.websites.length}
            >
              {authority.websites.map((url) => (
                <DetailEntry
                  key={url}
                  primary={
                    <Link href={url} target="_blank" rel="noreferrer">
                      {url}
                    </Link>
                  }
                />
              ))}
            </AuthorityDetailBlock>
          </Box>
        </Paper>
      ))}
    </Stack>
  );
}

interface AuthorityDetailBlockProps {
  title: string;
  empty: boolean;
  children: ReactNode;
}

function AuthorityDetailBlock({
  title,
  empty,
  children,
}: AuthorityDetailBlockProps) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="overline"
        component="h4"
        sx={{ color: 'text.secondary', marginBottom: 0.5 }}
      >
        {title}
      </Typography>
      {empty ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          None
        </Typography>
      ) : (
        <Stack spacing={1}>{children}</Stack>
      )}
    </Box>
  );
}

interface DetailEntryProps {
  primary: ReactNode;
  secondary?: string;
}

function DetailEntry({ primary, secondary }: DetailEntryProps) {
  return (
    <Box sx={{ overflowWrap: 'anywhere' }}>
      <Typography variant="body2" component="div">
        {primary}
      </Typography>
      {secondary && (
        <Typography
          variant="caption"
          component="div"
          sx={{ color: 'text.secondary' }}
        >
          {secondary}
        </Typography>
      )}
    </Box>
  );
}

function formatAddress(address: AuthorityAddress): string {
  const streetLine = [address.street, address.houseNumber]
    .filter(Boolean)
    .join(' ');
  const cityLine = [address.postalCode, address.city].filter(Boolean).join(' ');

  return [address.postBox, streetLine, cityLine].filter(Boolean).join(', ');
}

function renderContactValue(contact: AuthorityContact): ReactNode {
  if (contact.type === AuthorityContactType.Web) {
    return (
      <Link href={contact.value} target="_blank" rel="noreferrer">
        {contact.value}
      </Link>
    );
  }
  return contact.value;
}
