import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ChatPage from "./pages/ChatPage";
import PricingPage from "./pages/PricingPage";
import AccountPage from "./pages/AccountPage";
import BillingPage from "./pages/BillingPage";
import WhatsAppButton from "./components/WhatsAppButton";
import LogoutSuccess from "./pages/LogoutSuccess";
import DemoWebAnalysis from "./pages/DemoWebAnalysis";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import {
  AdminLayout,
  AdminDashboard,
  AdminWhiteLabel,
  AdminInstructions,
  AdminKnowledge,
  AdminProviders,
  AdminLogs,
  AdminConversations,
  AdminUsers,
  AdminAudit,
  AdminCapabilities,
  AdminAssets,
} from "./pages/admin";
import AdminLearning from "./pages/admin/AdminLearning";
// Docs pages removed — now hosted on GitHub as markdown files

function AdminPage({ component: Component }: { component: React.ComponentType }) {
  return (
    <AdminLayout>
      <Component />
    </AdminLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/chat"} component={ChatPage} />
      <Route path={"/pricing"} component={PricingPage} />
      <Route path={"/account"} component={AccountPage} />
      <Route path={"/billing"} component={BillingPage} />
      <Route path={"/login"} component={LoginPage} />
      <Route path={"/forgot-password"} component={ForgotPasswordPage} />
      <Route path={"/reset-password"} component={ResetPasswordPage} />
      <Route path={"/logout-success"} component={LogoutSuccess} />
      <Route path={"/demo/web-analysis"} component={DemoWebAnalysis} />
      <Route path={"/termos"} component={TermsPage} />
      <Route path={"/privacidade"} component={PrivacyPage} />

      {/* Docs routes — redirect to GitHub */}
      <Route path="/docs/whitepaper">{() => { window.location.href = "https://github.com/SperryTecnologia/debuga-ai/blob/main/docs/WHITEPAPER_PTBR.md"; return null; }}</Route>
      <Route path="/docs/architecture">{() => { window.location.href = "https://github.com/SperryTecnologia/debuga-ai/blob/main/docs/ARCHITECTURE_PTBR.md"; return null; }}</Route>
      <Route path="/docs/white-label-enterprise">{() => { window.location.href = "https://github.com/SperryTecnologia/debuga-ai/blob/main/docs/WHITE_LABEL_OVERVIEW.md"; return null; }}</Route>

      {/* Admin routes */}
      <Route path={"/admin"}>{() => <AdminPage component={AdminDashboard} />}</Route>
      <Route path={"/admin/white-label"}>{() => <AdminPage component={AdminWhiteLabel} />}</Route>
      <Route path={"/admin/instructions"}>{() => <AdminPage component={AdminInstructions} />}</Route>
      <Route path={"/admin/knowledge"}>{() => <AdminPage component={AdminKnowledge} />}</Route>
      <Route path={"/admin/providers"}>{() => <AdminPage component={AdminProviders} />}</Route>
      <Route path={"/admin/logs"}>{() => <AdminPage component={AdminLogs} />}</Route>
      <Route path={"/admin/conversations"}>{() => <AdminPage component={AdminConversations} />}</Route>
      <Route path={"/admin/users"}>{() => <AdminPage component={AdminUsers} />}</Route>
      <Route path={"/admin/audit"}>{() => <AdminPage component={AdminAudit} />}</Route>
      <Route path={"/admin/learning"}>{() => <AdminPage component={AdminLearning} />}</Route>
      <Route path={"/admin/capabilities"}>{() => <AdminPage component={AdminCapabilities} />}</Route>
      <Route path={"/admin/assets"}>{() => <AdminPage component={AdminAssets} />}</Route>

      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
          <WhatsAppButton />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
