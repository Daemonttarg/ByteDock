import { useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { DashboardPage, LoginPage, ProblemDetailPage, ProblemEditorPage, ProblemsPage, RegisterPage, SettingsPage, StudentAnalyticsPage, StudentsPage, SubmissionsPage } from '@/pages/app-pages';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();
setAuthTokenGetter(() => (typeof window === 'undefined' ? null : localStorage.getItem('bytedock-token')));

function Home() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(localStorage.getItem('bytedock-token') ? '/dashboard' : '/login');
  }, [setLocation]);
  return null;
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/problems" component={ProblemsPage} />
        <Route path="/problems/:id" component={ProblemDetailPage} />
        <Route path="/submissions" component={SubmissionsPage} />
        <Route path="/students" component={StudentsPage} />
        <Route path="/students/:id/analytics" component={StudentAnalyticsPage} />
        <Route path="/admin/problems/new" component={ProblemEditorPage} />
        <Route path="/admin/problems/:id/edit" component={ProblemEditorPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
