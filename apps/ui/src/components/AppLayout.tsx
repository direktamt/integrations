import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ArticleIcon from '@mui/icons-material/Article';
import LanguageIcon from '@mui/icons-material/Language';
import ListAltIcon from '@mui/icons-material/ListAlt';
import PlaceIcon from '@mui/icons-material/Place';
import {
  AppBar,
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import { ReactNode } from 'react';
import { Link, Outlet, useLocation } from 'react-router';

const DRAWER_WIDTH = 220;

interface NavigationItem {
  label: string;
  path: string;
  icon: ReactNode;
}

const NAVIGATION_ITEMS: NavigationItem[] = [
  { label: 'Locations', path: '/locations', icon: <PlaceIcon /> },
  { label: 'Services', path: '/services', icon: <AccountBalanceIcon /> },
  {
    label: 'Online services',
    path: '/online-services',
    icon: <LanguageIcon />,
  },
  { label: 'Catalog', path: '/catalog', icon: <ListAltIcon /> },
  { label: 'Master texts', path: '/master-texts', icon: <ArticleIcon /> },
];

/**
 * Layout shell: permanent drawer navigation + content area.
 */
export function AppLayout() {
  const { pathname } = useLocation();

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap>
            Direktamt Integrations
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar />
        <List>
          {NAVIGATION_ITEMS.map((item) => (
            <ListItemButton
              key={item.path}
              component={Link}
              to={item.path}
              selected={pathname.startsWith(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, minWidth: 0 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
