import { lazy } from 'react';
import { Battery, Calculator, Car, FileText, History, Home, LayoutDashboard, Lightbulb, Presentation, Search, Sun } from 'lucide-react';
import HomeLanding from './HomeLanding';

const ApplianceAuditor = lazy(() => import('./ApplianceAuditor'));
const BillDecoder = lazy(() => import('./BillDecoder'));
const BlackoutSimulator = lazy(() => import('./BlackoutSimulator'));
const ConsultWizard = lazy(() => import('./ConsultWizard'));
const EVCalculator = lazy(() => import('./EVCalculator'));
const ProposalGenerator = lazy(() => import('./ProposalGenerator'));
const ROICalculator = lazy(() => import('./ROICalculator'));
const SimpleSolarROI = lazy(() => import('./SimpleSolarROI'));
const UsageEstimator = lazy(() => import('./UsageEstimator'));
const NEM1Explainer = lazy(() => import('./nem').then(module => ({ default: module.NEM1Explainer })));
const NEM2Explainer = lazy(() => import('./nem').then(module => ({ default: module.NEM2Explainer })));
const NEM3Explainer = lazy(() => import('./nem').then(module => ({ default: module.NEM3Explainer })));

// Each entry: { id, title, navLabel, icon, section, component, needsExport? }
export const TOOLS = [
  { id: 'home', title: 'Choose your question', navLabel: 'Home', icon: Home, section: 'main', component: HomeLanding },
  { id: 'simple-roi', title: 'Is solar worth it?', navLabel: 'Solar Savings (Simple)', icon: Sun, section: 'main', component: SimpleSolarROI },
  { id: 'consult', title: 'Client Consult', navLabel: 'Client Consult', icon: Presentation, section: 'main', component: ConsultWizard, needsExport: true },
  { id: 'calculator', title: 'ROI Calculator', navLabel: 'ROI Calculator (Pro)', icon: LayoutDashboard, section: 'main', component: ROICalculator, needsExport: true },
  { id: 'estimator', title: 'Usage Estimator', navLabel: 'Usage Estimator', icon: Calculator, section: 'main', component: UsageEstimator, needsExport: true },
  { id: 'audit', title: 'Appliance Auditor', navLabel: 'Appliance Auditor', icon: Lightbulb, section: 'main', component: ApplianceAuditor, needsExport: true },
  { id: 'ev', title: 'EV Switch', navLabel: 'EV Switch', icon: Car, section: 'main', component: EVCalculator, needsExport: true },
  { id: 'blackout', title: 'Blackout Simulator', navLabel: 'Blackout Simulator', icon: Battery, section: 'main', component: BlackoutSimulator, needsExport: true },
  { id: 'bill', title: 'Smart Bill Decoder', navLabel: 'Smart Bill Decoder', icon: Search, section: 'main', component: BillDecoder, needsExport: true },
  { id: 'proposal', title: 'Proposal Generator', navLabel: 'Proposal Generator', icon: FileText, section: 'main', component: ProposalGenerator },
  { id: 'nem1', title: 'NEM 1.0', navLabel: 'NEM 1.0 (Legacy)', icon: History, section: 'education', component: NEM1Explainer },
  { id: 'nem2', title: 'NEM 2.0', navLabel: 'NEM 2.0 (Transition)', icon: History, section: 'education', component: NEM2Explainer },
  { id: 'nem3', title: 'NEM 3.0', navLabel: 'NEM 3.0 (Current)', icon: Presentation, section: 'education', component: NEM3Explainer },
];
