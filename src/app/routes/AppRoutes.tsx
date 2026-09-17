import { Route, Routes } from 'react-router';
import { PublicLayout } from '../layouts/PublicLayout';
import { HomePage } from '../../features/discovery/pages/HomePage';
import { RouteComingSoon } from './RouteComingSoon';
import { RouteNotFound } from './RouteNotFound';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
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
