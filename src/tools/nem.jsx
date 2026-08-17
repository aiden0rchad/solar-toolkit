import { Legend, Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { History, Presentation } from 'lucide-react';
import { Card } from '../components/ui';
import { SERIES, chartTooltip, gridProps, legendProps, lineProps, xAxisProps, yAxisProps } from '../components/chartTheme';

// --- NEM EXPLAINERS (Original) ---
// Prose pages: one column, hairline rules, no per-era color coding. Import is always the
// orange cost baseline, export always the blue solar series — entity-stable app-wide.

const Explainer = ({ icon: Icon, title, intro, chart, notes }) => (
  <article className="mx-auto max-w-prose">
    <header className="mb-6">
      <h2 className="flex items-center gap-2 text-[22px] font-semibold text-ink">
        <Icon size={18} className="text-ink-2" aria-hidden="true" /> {title}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-2">{intro}</p>
    </header>
    <Card className="p-4">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart.data}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="hour" {...xAxisProps} />
            <YAxis domain={chart.domain} {...yAxisProps} />
            <Tooltip {...chartTooltip} />
            <Legend {...legendProps} />
            <Line type={chart.type} dataKey="i" name="Import" stroke={SERIES.grid} {...lineProps} />
            <Line type={chart.type} dataKey="e" name="Export" stroke={SERIES.solar} {...lineProps} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
    <div className="mt-6 space-y-4">
      {notes.map(note => (
        <section key={note.title} className="border-t border-line pt-4">
          <h3 className="text-sm font-semibold text-ink">{note.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">{note.body}</p>
        </section>
      ))}
    </div>
  </article>
);

export const NEM1Explainer = () => (
  <Explainer
    icon={History}
    title="NEM 1.0: The Golden Era"
    intro="Legacy systems installed before 2017. 100% efficient grid battery."
    chart={{
      type: 'step',
      domain: [0, 0.4],
      data: [{ hour: 'Mid', i: 0.2, e: 0.2 }, { hour: 'Noon', i: 0.2, e: 0.2 }, { hour: 'Eve', i: 0.2, e: 0.2 }],
    }}
    notes={[
      { title: '1-for-1 Swap', body: 'Import and Export rates were identical.' },
    ]}
  />
);

export const NEM2Explainer = () => (
  <Explainer
    icon={History}
    title="NEM 2.0: The Transition"
    intro="2017-2023. Introduced Time-of-Use and NBCs."
    chart={{
      type: 'monotone',
      domain: [0, 0.6],
      data: [{ hour: 'Mid', i: 0.35, e: 0.32 }, { hour: '4PM', i: 0.50, e: 0.47 }, { hour: '9PM', i: 0.35, e: 0.32 }],
    }}
    notes={[
      { title: 'TOU + NBCs', body: 'Small non-bypassable charges (~2¢) added to imports.' },
    ]}
  />
);

export const NEM3Explainer = () => (
  <Explainer
    icon={Presentation}
    title="NEM 3.0: The New Reality"
    intro={'Current policy. The "Buy High, Sell Low" problem.'}
    chart={{
      type: 'step',
      domain: [0, 0.7],
      data: [{ hour: 'Mid', i: 0.35, e: 0.04 }, { hour: 'Noon', i: 0.35, e: 0.03 }, { hour: 'Eve', i: 0.58, e: 0.06 }],
    }}
    notes={[
      { title: '75% Value Drop', body: 'Exports are worth ~4¢. Imports cost ~58¢.' },
      { title: 'Battery Required', body: 'Store cheap solar, use it when rates are high.' },
    ]}
  />
);
