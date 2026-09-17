import { Route, Routes } from 'react-router';
import { PublicLayout } from '../layouts/PublicLayout';
import { HomePage } from '../../features/discovery/pages/HomePage';
import { SearchPage } from '../../features/search/pages/SearchPage';
import { RouteComingSoon } from './RouteComingSoon';
import { RouteNotFound } from './RouteNotFound';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="job/:jobId" element={<RouteComingSoon />} />
        <Route path="category/:topCategoryId" element={<RouteComingSoon />} />
        <Route path="category/:topCategoryId/group/:groupId" element={<RouteComingSoon />} />
        <Route
          path="category/:topCategoryId/group/:groupId/detail/:detailCategoryId"
          element={<RouteComingSoon />}
        />
        <Route path="*" element={<RouteNotFound />} />
      </Route>
    </Routes>
  );
}
