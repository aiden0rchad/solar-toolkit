import { lazy } from 'react';
import { ArrowLeftRight, Calculator, Car, Clock, FileText, Home, Lightbulb, Receipt, Scale, SlidersHorizontal, Sun, Users, Zap } from 'lucide-react';
import HomeLanding from './HomeLanding';

const ApplianceAuditor = lazy(() => import('./ApplianceAuditor'));
const BillDecoder = lazy(() => import('./BillDecoder'));
const BlackoutSimulator = lazy(() => import('./BlackoutSimulator'));
const EVCalculator = lazy(() => import('./EVCalculator'));
const SimpleSolarROI = lazy(() => import('./SimpleSolarROI'));
const UsageEstimator = lazy(() => import('./UsageEstimator'));
const NEM1Explainer = lazy(() => import('./nem').then(module => ({ default: module.NEM1Explainer })));
const NEM2Explainer = lazy(() => import('./nem').then(module => ({ default: module.NEM2Explainer })));
const NEM3Explainer = lazy(() => import('./nem').then(module => ({ default: module.NEM3Explainer })));

// Each entry: { id, title, navLabel, icon, section, tier, component, needsExport? }
export const TOOLS = [
  { id: 'home', title: 'Choose your question', navLabel: 'Home', icon: Home, section: 'main', tier: 'free', component: HomeLanding },
  { id: 'simple-roi', title: 'Is solar worth it?', navLabel: 'Solar Savings', icon: Sun, section: 'main', tier: 'free', component: SimpleSolarROI },
  // Pro tools are implemented in the private Pro build (solar-toolkit-pro),
  // which re-adds their components here. In this public build the entries are
  // metadata only and render the locked preview card.
  { id: 'consult', title: 'Client Consult', navLabel: 'Client Consult', icon: Users, section: 'main', tier: 'pro', component: null, needsExport: true },
  { id: 'calculator', title: 'ROI Calculator', navLabel: 'ROI Calculator', icon: SlidersHorizontal, section: 'main', tier: 'pro', component: null, needsExport: true },
  { id: 'estimator', title: 'Usage Estimator', navLabel: 'Usage Estimator', icon: Calculator, section: 'main', tier: 'free', component: UsageEstimator, needsExport: true },
  { id: 'audit', title: 'Appliance Auditor', navLabel: 'Appliance Auditor', icon: Lightbulb, section: 'main', tier: 'free', component: ApplianceAuditor, needsExport: true },
  { id: 'ev', title: 'EV Switch', navLabel: 'EV Switch', icon: Car, section: 'main', tier: 'free', component: EVCalculator, needsExport: true },
  { id: 'blackout', title: 'Blackout Simulator', navLabel: 'Battery Backup', icon: Zap, section: 'main', tier: 'free', component: BlackoutSimulator, needsExport: true },
  { id: 'bill', title: 'Smart Bill Decoder', navLabel: 'Bill Decoder', icon: Receipt, section: 'main', tier: 'free', component: BillDecoder, needsExport: true },
  { id: 'proposal', title: 'Proposal Generator', navLabel: 'Proposal Generator', icon: FileText, section: 'main', tier: 'pro', component: null },
  { id: 'nem1', title: 'NEM 1.0', navLabel: 'NEM 1.0', icon: Clock, section: 'education', tier: 'free', component: NEM1Explainer },
  { id: 'nem2', title: 'NEM 2.0', navLabel: 'NEM 2.0', icon: ArrowLeftRight, section: 'education', tier: 'free', component: NEM2Explainer },
  { id: 'nem3', title: 'NEM 3.0', navLabel: 'NEM 3.0', icon: Scale, section: 'education', tier: 'free', component: NEM3Explainer },
];
