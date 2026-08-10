import { Suspense, useEffect, useState } from 'react';
import { Lock, Zap } from 'lucide-react';
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

const educationClasses = {
  nem1: ['bg-sky-500/10 text-sky-400', 'text-slate-400 hover:bg-slate-800/30'],
  nem2: ['bg-orange-500/10 text-orange-400', 'text-slate-400 hover:bg-slate-800/30'],
  nem3: ['bg-red-500/10 text-red-400', 'text-slate-400 hover:bg-slate-800/30'],
};

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
    <div className="min-h-screen font-sans text-slate-200 flex" style={{ background: 'var(--bg-primary)' }}>
      {/* Sidebar Navigation */}
      <div className="w-64 h-screen overflow-y-auto flex-shrink-0 hidden lg:block print:hidden" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)', borderRight: '1px solid rgba(148,163,184,0.08)' }}>
        <div className="p-6">
          <h1 className="text-xl font-black text-slate-100 flex items-center gap-2"><Zap className="text-amber-400 fill-amber-400" /> SolarPro</h1>
          <p className="text-xs text-slate-400 mt-1 font-medium uppercase tracking-wider">Consultant Toolkit</p>
        </div>
        <nav className="mt-2 px-4 space-y-1">
          {mainTools.map(tool => {
            const Icon = tool.icon;
            return <button key={tool.id} onClick={() => setView(tool.id)} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all ${view === tool.id ? 'bg-sky-500/15 text-sky-400 shadow-lg shadow-sky-500/10' : 'text-slate-400 hover:bg-slate-700/40'}`}><Icon size={18} /> <span className="flex-1 text-left">{tool.navLabel}</span>{tool.tier === 'pro' && <Lock size={13} className="text-amber-400" aria-label="Pro tool" />}</button>;
          })}
          <div className="pt-4 pb-2 px-2 text-xs font-bold text-slate-400 uppercase tracking-wider">NEM Education</div>
          {educationTools.map(tool => {
            const Icon = tool.icon;
            const [activeClass, inactiveClass] = educationClasses[tool.id];
            return <button key={tool.id} onClick={() => setView(tool.id)} className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-bold rounded-xl transition-all ${view === tool.id ? activeClass : inactiveClass}`}><Icon size={16} /> {tool.navLabel}</button>;
          })}
        </nav>
      </div>
      {/* Mobile Nav */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 px-4 py-3 flex justify-between items-center print:hidden" style={{ background: 'rgba(11,17,32,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
        <div className="font-bold flex items-center gap-2"><Zap className="text-amber-400 fill-amber-400" size={20} /> SolarPro</div>
        <select value={view} onChange={(e) => setView(e.target.value)} className="bg-slate-800/30 border border-slate-700/50 rounded-lg px-3 py-1 text-sm font-bold">
          {TOOLS.map(tool => <option key={tool.id} value={tool.id}>{tool.navLabel}{tool.tier === 'pro' ? ' 🔒' : ''}</option>)}
        </select>
      </div>
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-8 mt-14 lg:mt-0 print:m-0 print:p-0">
        {activeTool.tier === 'pro' && !isPro
          ? <ProLockCard tool={activeTool} />
          : <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center" role="status" aria-label="Loading"><div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-sky-400" /></div>}>
              <ActiveComponent {...activeProps} />
            </Suspense>}
      </div>
      {showProUpsell && <ProUpsellModal onClose={() => setShowProUpsell(false)} />}
    </div>
  );
};

export default App;
