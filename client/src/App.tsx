import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ThemeSwitcher from "./components/ThemeSwitcher";
import PageAccessGuard from "./components/PageAccessGuard";
import Home from "./pages/Home";
import StockDetail from "./pages/StockDetail";
import Admin from "./pages/Admin";
import About from "./pages/About";
import CryptoInvestment from "./pages/CryptoInvestment";
import CryptoPanorama from "./pages/CryptoPanorama";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/stock/:symbol"} component={StockDetail} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/about"} component={About} />
      <Route path={"/crypto-investment"} component={CryptoInvestment} />
      <Route path={"/crypto-panorama"} component={CryptoPanorama} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
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
          <ThemeSwitcher />
          <PageAccessGuard>
            <Router />
          </PageAccessGuard>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
