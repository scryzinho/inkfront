import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Checkout from "./pages/Checkout";
import Setup from "./pages/Setup";
import JoinInkcloud from "./pages/JoinInkcloud";
import NotFound from "./pages/NotFound";

// Dashboard imports
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import DashboardOverview from "./pages/dashboard/Overview";
import StorePage from "./pages/dashboard/Store";
import TicketsPage from "./pages/dashboard/Tickets";
import AutomationsPage from "./pages/dashboard/Automations";
import ProtectionPage from "./pages/dashboard/Protection";
import GiveawaysPage from "./pages/dashboard/Giveaways";
import CloudPage from "./pages/dashboard/Cloud";
import EarningsPage from "./pages/dashboard/Earnings";
import AppearancePage from "./pages/dashboard/Appearance";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/join-inkcloud" element={<JoinInkcloud />} />
          
          {/* Dashboard Routes */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardOverview />} />
            <Route path="store" element={<StorePage />} />
            <Route path="tickets" element={<TicketsPage />} />
            <Route path="automations" element={<AutomationsPage />} />
            <Route path="automacoes/sugestoes" element={<AutomationsPage singleTab initialTab="suggestions" />} />
            <Route path="protection" element={<ProtectionPage />} />
            <Route path="giveaways" element={<GiveawaysPage />} />
            <Route path="cloud" element={<CloudPage />} />
            <Route path="earnings" element={<EarningsPage />} />
            <Route path="appearance" element={<AppearancePage />} />
          </Route>
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
