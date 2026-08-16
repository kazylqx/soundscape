import { useEffect, type ReactNode } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, RequireAuth } from '@/auth/AuthContext';
import { Layout } from '@/components/layout/Layout';
import { PageTransition } from '@/components/layout/PageTransition';
import {
  Callback,
  Compare,
  Dashboard,
  Decades,
  Landing,
  Moods,
  Playlists,
  Profile,
  Recommendations,
  Share,
} from '@/pages';

/**
 * Raiz da aplicacao.
 *
 * Hierarquia: Router -> AuthProvider (precisa de useNavigate) -> rotas.
 * As rotas privadas passam por RequireAuth e recebem o Layout, que traz
 * navegacao, tema dinamico e mini-player.
 */

/** Rola para o topo em cada troca de rota (menos quando o browser restaura). */
function ScrollToTop(): null {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}

/** Envolve uma pagina privada com guarda, layout e transicao. */
function Private({
  children,
  bleed = false,
}: {
  children: ReactNode;
  bleed?: boolean;
}): JSX.Element {
  return (
    <RequireAuth>
      <Layout bleed={bleed}>
        <PageTransition>{children}</PageTransition>
      </Layout>
    </RequireAuth>
  );
}

function AnimatedRoutes(): JSX.Element {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Publicas */}
        <Route path="/" element={<Landing />} />
        <Route path="/callback" element={<Callback />} />

        {/* Privadas */}
        <Route
          path="/dashboard"
          element={
            <Private>
              <Dashboard />
            </Private>
          }
        />
        <Route
          path="/profile"
          element={
            <Private bleed>
              <Profile />
            </Private>
          }
        />
        <Route
          path="/recommendations"
          element={
            <Private>
              <Recommendations />
            </Private>
          }
        />
        <Route
          path="/playlists"
          element={
            <Private>
              <Playlists />
            </Private>
          }
        />
        <Route
          path="/moods"
          element={
            <Private>
              <Moods />
            </Private>
          }
        />
        <Route
          path="/decades"
          element={
            <Private>
              <Decades />
            </Private>
          }
        />
        <Route
          path="/share"
          element={
            <Private>
              <Share />
            </Private>
          }
        />
        <Route
          path="/compare"
          element={
            <Private>
              <Compare />
            </Private>
          }
        />

        {/* Qualquer outra rota volta para a home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <AnimatedRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
