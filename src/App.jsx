import { Suspense, useEffect, useState } from 'react';
import { Lock, Sun } from 'lucide-react';
import ProLockCard from './components/ProLockCard';
import ProUpsellModal from './components/ProUpsellModal';
import { useEntitlement } from './entitlement/useEntitlement';
import { TOOLS } from './tools/registry';

const EXPORT_SECTIONS = {
  consult: 'roi',
  calculator: 'roi',
  estimator: 'usage',
  audit: 'audit',
  ev: 'ev',
  blackout: 'blackout',
  bill: 'bill',
};

// One nav treatment for every item — main tools and NEM education alike.
// Active carries a 2px accent left rule; inactive keeps a transparent rule of the
// same width so nothing shifts on selection.
const navItemClass = (isActive) => `w-full flex items-center gap-2.5 border-l-2 rounded-r-md px-3 py-2 text-[13px] font-medium ${isActive
  ? 'border-accent bg-accent-wash text-ink'
  : 'border-transparent text-ink-2 hover:bg-field'
  }`;

const viewFromHash = () => {
  const id = window.location.hash.replace(/^#\/?/, '');
  return TOOLS.some(tool => tool.id === id) ? id : 'home';
};

const App = () => {
  const { isPro } = useEntitlement();
  const [view, setView] = useState(viewFromHash);
  const [showProUpsell, setShowProUpsell] = useState(false);
  const [proposalData, setProposalData] = useState(() => {
    try {
      const saved = localStorage.getItem('solartoolkit-proposal');
      if (saved) return JSON.parse(saved);
    } catch { /* corrupted or unavailable storage — start fresh */ }
    return { clientName: '', roi: null, usage: null, audit: null, ev: null, blackout: null, bill: null };
  });

  useEffect(() => {
    try { localStorage.setItem('solartoolkit-proposal', JSON.stringify(proposalData)); } catch { /* storage full/blocked */ }
  }, [proposalData]);

  useEffect(() => {
    const handleHashChange = () => setView(viewFromHash());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const expectedHash = `#/${view}`;
    const currentHash = window.location.hash;
    if (currentHash !== expectedHash) {
      const currentId = currentHash.replace(/^#\/?/, '');
      const isKnownView = TOOLS.some(tool => tool.id === currentId);
      if (!currentHash || !isKnownView) window.history.replaceState(window.history.state, '', expectedHash);
      else window.location.hash = expectedHash;
    }
    const tool = TOOLS.find(item => item.id === view) || TOOLS[0];
    document.title = `${tool.title} — SolarPro Toolkit`;
  }, [view]);

  const exportToProposal = (section, data) => {
    if (!isPro) {
      setShowProUpsell(true);
      return;
    }
    setProposalData(prev => ({ ...prev, [section]: data }));
    setView('proposal');
  };

  const activeTool = TOOLS.find(tool => tool.id === view) || TOOLS[0];
  const ActiveComponent = activeTool.component;
  const activeProps = activeTool.id === 'home'
    ? { onNavigate: setView, tools: TOOLS }
    : activeTool.id === 'simple-roi'
      ? { onNavigate: setView }
    : activeTool.id === 'consult'
    ? { onExport: data => exportToProposal('roi', data), goProMode: () => setView('calculator') }
    : activeTool.id === 'proposal'
      ? { proposalData, setProposalData }
      : activeTool.needsExport
        ? { onExport: data => exportToProposal(EXPORT_SECTIONS[activeTool.id], data) }
        : {};
  const mainTools = TOOLS.filter(tool => tool.section === 'main');
  const educationTools = TOOLS.filter(tool => tool.section === 'education');

  return (
    <div className="min-h-screen font-sans bg-paper text-ink-2 flex">
      {/* Sidebar Navigation */}
      <div className="w-64 h-screen overflow-y-auto flex-shrink-0 hidden lg:block print:hidden bg-paper border-r border-line">
        <div className="p-6">
          <h1 className="flex items-center gap-2 text-[15px] font-semibold text-ink"><Sun size={16} strokeWidth={1.5} className="text-accent" /> SolarPro Toolkit</h1>
        </div>
        <nav className="mt-1 px-3 space-y-0.5">
          {mainTools.map(tool => {
            const Icon = tool.icon;
            return <button key={tool.id} onClick={() => setView(tool.id)} className={navItemClass(view === tool.id)}><Icon size={16} strokeWidth={1.5} /> <span className="flex-1 text-left">{tool.navLabel}</span>{tool.tier === 'pro' && !isPro && <Lock size={13} strokeWidth={1.5} className="text-ink-3" aria-label="Pro tool" />}</button>;
          })}
          <div className="eyebrow px-3 pt-5 pb-2">NEM Education</div>
          {educationTools.map(tool => {
            const Icon = tool.icon;
            return <button key={tool.id} onClick={() => setView(tool.id)} className={navItemClass(view === tool.id)}><Icon size={16} strokeWidth={1.5} /> <span className="flex-1 text-left">{tool.navLabel}</span></button>;
          })}
        </nav>
      </div>
      {/* Mobile Nav */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 px-4 py-3 flex justify-between items-center print:hidden bg-paper border-b border-line">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-ink"><Sun size={16} strokeWidth={1.5} className="text-accent" /> SolarPro</div>
        <select value={view} onChange={(e) => setView(e.target.value)} className="rounded-md border border-line bg-surface px-3 py-1 text-[13px] font-medium text-ink">
          {/* ROI Calculator's navLabel already ends in "(Pro)" — don't stutter the suffix onto it. */}
          {TOOLS.map(tool => <option key={tool.id} value={tool.id}>{tool.navLabel}{tool.tier === 'pro' && !isPro && !tool.navLabel.includes('(Pro)') ? ' (Pro)' : ''}</option>)}
        </select>
      </div>
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-8 mt-14 lg:mt-0 print:m-0 print:p-0">
        {(activeTool.tier === 'pro' && !isPro) || !activeTool.component
          ? <ProLockCard tool={activeTool} />
          : <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center" role="status" aria-label="Loading"><div className="h-8 w-8 animate-spin rounded-full border-[1.5px] border-line border-t-ink-3" /></div>}>
              <ActiveComponent {...activeProps} />
            </Suspense>}
      </div>
      {showProUpsell && <ProUpsellModal onClose={() => setShowProUpsell(false)} />}
    </div>
  );
};

export default App;
