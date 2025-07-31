import { Header } from '@/components/layout/Header';
import { observer } from 'mobx-react-lite';
import { Suspense, lazy } from 'react';
import { Route, BrowserRouter as Router, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Footer } from './components/layout/Footer';
import { Loader } from './components/layout/Loader';
import { useStore } from './store/root.store';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { MainAdmin } from './components/subpages/admin/main';
import { UsersShow } from './components/subpages/admin/usersShow';
import { UserDetails } from './components/subpages/admin/userDetails';
import { UserRoles } from './types/auth';
import { Garants } from './components/subpages/admin/garants';

const MainPage = lazy(() => import('./pages/MainPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const NoRightsPage = lazy(() => import('./pages/NoRightsPage'));
const NotFoundPage = lazy(() => import('./components/layout/NotFound'));

function App() {
  return (
    <Router>

      <div className="relative min-h-screen flex flex-col bg-gradient-to-br from-[#0a0a23] via-[#1a1333] to-[#09090b]">
        <Header />
        <Suspense fallback={<Loader />}>
          <Routes>
            {/* <Route path={RoutesConfig.NO_RIGHTS.path} element={<NoRightsPage />} /> */}
            <Route path="*" element={<ProtectedRoutes />} />
          </Routes>
        </Suspense>
        <Footer />
      </div>
    </Router>
  );
}

const ProtectedRoutes = observer(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userStore: { user, isLoading }, routesStore: { getPathByKey } } = useStore();

  // console.log(user)

  // useEffect(() => {
  //   if (!isLoading && !user && location.pathname !== RoutesConfig.NO_RIGHTS.path) {
  //     navigate(RoutesConfig.NO_RIGHTS.path);
  //   }
  // }, [user, location.pathname, navigate, isLoading]);

  if (isLoading) {
    return null;
  }

  // if (!user?.hasAccess) return <NoRightsPage />

  return (
    <Routes>
      <Route path={getPathByKey('ADMIN') + "/*"} element={
        <ProtectedRoute allowedRoles={[UserRoles.Admin, UserRoles.SuperAdmin]}>
          <AdminPage />
        </ProtectedRoute>
      }>
        <Route index element={<MainAdmin />} />
        <Route path="users" element={<UsersShow />} />
        <Route path="users/:id" element={<UserDetails />} />

        <Route path="garants" element={<Garants />} />
      </Route>

      <Route index element={<MainPage />} />
      <Route path={getPathByKey('PROFILE')} element={<ProfilePage />} />

      <Route path='*' element={<NotFoundPage />} />
    </Routes>
  );
});

export { App };

