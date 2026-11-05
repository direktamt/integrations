import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import DataObjectOutlinedIcon from '@mui/icons-material/DataObjectOutlined';
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined';
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import {
  AppShell,
  ColorSchemeToggle,
  NavigationItem,
  NavigationList,
  ProductLockup,
} from '@direktamt/ui-kit';
import { Box, Button, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router';
import { API_BASE_URL } from '../api/ApiClient';

interface NavigationEntry {
  label: string;
  path: string;
  icon: ReactNode;
}

interface NavigationGroup {
  title: string;
  items: NavigationEntry[];
}

const NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    title: 'Territories',
    items: [
      { label: 'Locations', path: '/locations', icon: <PlaceOutlinedIcon /> },
    ],
  },
  {
    title: 'Services (PVOG)',
    items: [
      {
        label: 'Services',
        path: '/services',
        icon: <AccountBalanceOutlinedIcon />,
      },
      {
        label: 'Online services',
        path: '/online-services',
        icon: <LanguageOutlinedIcon />,
      },
    ],
  },
  {
    title: 'Federal catalog (FIM)',
    items: [
      { label: 'Catalog', path: '/catalog', icon: <ListAltOutlinedIcon /> },
      {
        label: 'Master texts',
        path: '/master-texts',
        icon: <ArticleOutlinedIcon />,
      },
    ],
  },
  {
    title: 'Diagnostics',
    items: [
      { label: 'Raw sources', path: '/raw', icon: <DataObjectOutlinedIcon /> },
    ],
  },
];

/**
 * Layout shell: DirektAmt header, grouped side navigation, content column.
 */
export function AppLayout() {
  const { pathname } = useLocation();

  return (
    <AppShell
      brand={<ProductLockup product="Integrations" href="/" animated />}
      headerActions={
        <>
          <Button
            href={`${API_BASE_URL}/docs`}
            target="_blank"
            rel="noreferrer"
            size="small"
            color="inherit"
            startIcon={<MenuBookOutlinedIcon />}
            sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
          >
            API docs
          </Button>
          <ColorSchemeToggle />
        </>
      }
      navigation={
        <Stack spacing={2.5}>
          {NAVIGATION_GROUPS.map((group) => (
            <NavigationList key={group.title} title={group.title}>
              {group.items.map((item) => (
                <NavigationItem
                  key={item.path}
                  href={item.path}
                  label={item.label}
                  icon={item.icon}
                  selected={pathname.startsWith(item.path)}
                />
              ))}
            </NavigationList>
          ))}
        </Stack>
      }
      navigationFooter={<ApiEndpointNote />}
    >
      <Outlet />
    </AppShell>
  );
}

/**
 * The API base URL the console talks to, at the foot of the navigation.
 */
function ApiEndpointNote() {
  return (
    <Box
      sx={{
        paddingInline: 1.5,
        paddingBlock: 1.25,
        borderRadius: 2,
        bgcolor: 'surface.inset',
      }}
    >
      <Typography
        variant="caption"
        component="div"
        sx={{ color: 'text.secondary', fontWeight: 600 }}
      >
        Integrations API
      </Typography>
      <Typography
        variant="caption"
        component="div"
        sx={{ fontFamily: 'monospace', overflowWrap: 'anywhere' }}
      >
        {API_BASE_URL}
      </Typography>
    </Box>
  );
}
