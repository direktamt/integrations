import { Navigate, Route, Routes } from 'react-router';
import { AppLayout } from './components/AppLayout';
import { ErrorSnackbar } from './components/ErrorSnackbar';
import { CatalogPage } from './pages/catalog/CatalogPage';
import { LocationsPage } from './pages/locations/LocationsPage';
import { MasterTextsPage } from './pages/masterTexts/MasterTextsPage';
import { OnlineServicesPage } from './pages/onlineServices/OnlineServicesPage';
import { ServiceContextPage } from './pages/services/ServiceContextPage';
import { ServiceDetailPage } from './pages/services/ServiceDetailPage';
import { ServicesPage } from './pages/services/ServicesPage';

/**
 * Route table inside the layout shell.
 */
export function App() {
  return (
    <>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/services" replace />} />
          <Route path="/locations" element={<LocationsPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/services/:id" element={<ServiceDetailPage />} />
          <Route
            path="/services/:id/context"
            element={<ServiceContextPage />}
          />
          <Route path="/online-services" element={<OnlineServicesPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/master-texts" element={<MasterTextsPage />} />
        </Route>
      </Routes>
      <ErrorSnackbar />
    </>
  );
}
