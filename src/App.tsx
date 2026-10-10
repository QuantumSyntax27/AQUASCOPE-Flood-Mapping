import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AnalysisProvider } from './context/AnalysisContext';
import { DemoProvider } from './context/DemoContext';
import { DemoOverlay } from './components/demo/DemoOverlay';
import { AppShell } from './components/layout/AppShell';
import { Intro } from './pages/Intro';
import { Home } from './pages/Home';
import { SetupFlow } from './pages/SetupFlow';
import { AnalysisProgress } from './pages/AnalysisProgress';
import { Dashboard } from './pages/Dashboard';
import { FloodDetection } from './pages/FloodDetection';
import { Infrastructure } from './pages/Infrastructure';
import { Connectivity } from './pages/Connectivity';
import { Settlements } from './pages/Settlements';
import { Validation } from './pages/Validation';
import { HowItWorks } from './pages/HowItWorks';
import { Reports } from './pages/Reports';
import { About } from './pages/About';
import { DemoMode } from './pages/DemoMode';
import { HelpContact } from './pages/HelpContact';
import { NotFound } from './pages/NotFound';

export default function App() {
  return (
    <AnalysisProvider>
      <DemoProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Intro />} />
            <Route element={<AppShell />}>
              <Route path="/home" element={<Home />} />
              <Route path="/setup" element={<SetupFlow />} />
              <Route path="/analysis" element={<AnalysisProgress />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/flood" element={<FloodDetection />} />
              <Route path="/infrastructure" element={<Infrastructure />} />
              <Route path="/connectivity" element={<Connectivity />} />
              <Route path="/settlements" element={<Settlements />} />
              <Route path="/validation" element={<Validation />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/about" element={<About />} />
              <Route path="/help-contact" element={<HelpContact />} />
              <Route path="/demo" element={<DemoMode />} />
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Route>
          </Routes>
          <DemoOverlay />
        </HashRouter>
      </DemoProvider>
    </AnalysisProvider>
  );
}
