import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import AuthCallback from "./pages/AuthCallback.tsx";
import Onboarding from "./pages/Onboarding";
import WorkspaceHome from "./pages/dashboard/WorkspaceHome";
import { MyDocuments, MyProfile } from "./pages/dashboard/CandidatePortal";
import NotFound from "./pages/NotFound.tsx";
import DashboardLayout from "./pages/dashboard/DashboardLayout.tsx";
import ResumeAnalyzer from "./pages/dashboard/ResumeAnalyzer.tsx";
import CompareResumes from "./pages/dashboard/CompareResumes.tsx";
import CoverLetterGenerator from "./pages/dashboard/CoverLetterGenerator.tsx";
import InterviewPrep from "./pages/dashboard/InterviewPrep.tsx";
import AtsOptimizer from "./pages/dashboard/AtsOptimizer.tsx";
import ResumeBuilder from "./pages/dashboard/ResumeBuilder.tsx";
import GapAnalysis from "./pages/dashboard/GapAnalysis.tsx";
import AtsParseSim from "./pages/dashboard/AtsParseSim.tsx";
import Jobs from "./pages/dashboard/Jobs.tsx";
import PlaceholderPage from "./pages/dashboard/PlaceholderPage.tsx";
import Upgrade from "./pages/dashboard/Upgrade.tsx";
import { AuthProvider } from "@/hooks/useAuth";
import { Briefcase, Send, Bookmark } from "lucide-react";
import {
  PreviewApplications,
  PreviewOutreach,
  PreviewSaved,
} from "@/components/dashboard/EmptyState";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/app" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/app/home" replace />} />
            <Route path="home" element={<WorkspaceHome />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="documents" element={<MyDocuments />} />
            <Route path="profile" element={<MyProfile />} />
            <Route path="resume" element={<ResumeAnalyzer />} />
            <Route path="compare" element={<CompareResumes />} />
            <Route path="cover-letter" element={<CoverLetterGenerator />} />
            <Route path="interview-prep" element={<InterviewPrep />} />
            <Route path="ats-optimizer" element={<AtsOptimizer />} />
            <Route path="resume-builder" element={<ResumeBuilder />} />
            <Route path="gap-analysis" element={<GapAnalysis />} />
            <Route path="ats-parse-sim" element={<AtsParseSim />} />
            <Route
              path="applications"
              element={
                <PlaceholderPage
                  icon={Briefcase}
                  eyebrow="Applications"
                  title="Every conversation, in one place."
                  description="Track every role you've applied to — status, last touch, and what to do next. Filling out soon."
                  preview={<PreviewApplications />}
                />
              }
            />
            <Route
              path="outreach"
              element={
                <PlaceholderPage
                  icon={Send}
                  eyebrow="Outreach"
                  title="Cold DMs that warm up fast."
                  description="LinkedIn pings, recruiter follow-ups, and warm intros — all drafted, sent, and tracked from here."
                  preview={<PreviewOutreach />}
                />
              }
            />
            <Route
              path="saved"
              element={
                <PlaceholderPage
                  icon={Bookmark}
                  eyebrow="Saved roles"
                  title="The shortlist."
                  description="Roles you starred and want to come back to. We'll prep tailored materials when you're ready."
                  preview={<PreviewSaved />}
                />
              }
            />
            <Route path="upgrade" element={<Upgrade />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
