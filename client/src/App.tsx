import { Header } from '@/components/layout/Header';
import { observer } from 'mobx-react-lite';
import { Suspense, lazy } from 'react';
import { Route, BrowserRouter as Router, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Footer } from './components/layout/Footer';
import { Loader } from './components/layout/Loader';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AddPerson } from './components/subpages/admin/addPerson';
import { Garants } from './components/subpages/admin/garants';
import { MainAdmin } from './components/subpages/admin/main';
import { UserDetails } from './components/subpages/admin/userDetails';
import { UsersShow } from './components/subpages/admin/usersShow';
import { ScamForms } from './pages/ScamformsPage';
import ScammerPage from './pages/ScammerPage';
import { useStore } from './store/root.store';
import { UserRoles } from './types/auth';
import { ChatMessages } from './components/subpages/admin/chatMessages';

const MainPage = lazy(() => import('./pages/MainPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const NoRightsPage = lazy(() => import('./pages/NoRightsPage'));
const NotFoundPage = lazy(() => import('./components/layout/NotFound'));

function App() {
  return (
    <Router>

      <div className="relative min-h-screen flex flex-col bg-gradient-to-br bg-[#16102c]">
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

        <Route path="add-person" element={<AddPerson />} />
        {/* <Route path="new-users-messages" element={<NewUsersMessages />} /> */}

          <Route path="chat-messages" element={<ChatMessages />} />

        <Route path="garants" element={<Garants />} />
      </Route>

      <Route index element={<MainPage />} />
      <Route path={getPathByKey('PROFILE')} element={<ProfilePage />} />

      <Route path={'scamforms/:id'} element={<ScamForms />} />
      <Route path={getPathByKey('SCAMFORMS')} element={<ScamForms />} />

      <Route path={'scammers/:id/:formId'} element={<ScammerPage />} />
      <Route path={getPathByKey('SCAMMERS')} element={<ScammerPage />} />

      <Route path='*' element={<NotFoundPage />} />
    </Routes>
  );
});

export { App };

