import {
  AuthorityContactType,
  type AuthorityAddress,
  type AuthorityContact,
  type PublicAuthority,
} from '@direktamt/integrations-contracts';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Link,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { ReactNode } from 'react';
import { KeyChip } from '../../components/KeyChip';

interface ServiceAuthorityListProps {
  authorities: PublicAuthority[];
}

/**
 * Responsible authorities of a service: name, role, official id, and the
 * published addresses, contact channels and websites. Absent upstream data
 * is shown as absent.
 */
export function ServiceAuthorityList({
  authorities,
}: ServiceAuthorityListProps) {
  return (
    <Stack spacing={2}>
      {authorities.map((authority) => (
        <Card key={authority.id} variant="outlined">
          <CardContent>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
            >
              <Typography variant="subtitle1">
                {authority.name ?? '(unnamed)'}
              </Typography>
              <Chip
                label={authority.role}
                size="small"
                color="primary"
                variant="outlined"
              />
              <KeyChip value={authority.id} />
            </Stack>
            <AuthorityDetailBlock
              title="Addresses"
              empty={!authority.addresses.length}
            >
              <List dense disablePadding>
                {authority.addresses.map((address, index) => (
                  <ListItem key={index} disablePadding>
                    <ListItemText
                      primary={formatAddress(address)}
                      secondary={address.type}
                    />
                  </ListItem>
                ))}
              </List>
            </AuthorityDetailBlock>
            <AuthorityDetailBlock
              title="Contacts"
              empty={!authority.contacts.length}
            >
              <List dense disablePadding>
                {authority.contacts.map((contact, index) => (
                  <ListItem key={index} disablePadding>
                    <ListItemText
                      primary={renderContactValue(contact)}
                      secondary={[
                        contact.type,
                        contact.label,
                        contact.description,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    />
                  </ListItem>
                ))}
              </List>
            </AuthorityDetailBlock>
            <AuthorityDetailBlock
              title="Websites"
              empty={!authority.websites.length}
            >
              <List dense disablePadding>
                {authority.websites.map((url) => (
                  <ListItem key={url} disablePadding>
                    <Link href={url} target="_blank" rel="noreferrer">
                      {url}
                    </Link>
                  </ListItem>
                ))}
              </List>
            </AuthorityDetailBlock>
          </CardContent>
        </Card>
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
    <Box sx={{ mt: 1.5 }}>
      <Typography variant="subtitle2" gutterBottom>
        {title}
      </Typography>
      {empty ? (
        <Typography variant="body2" color="text.secondary">
          None
        </Typography>
      ) : (
        children
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
