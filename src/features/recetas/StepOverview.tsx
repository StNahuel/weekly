import { CARD } from '../../app/ui';
import type { Section } from '../../domain/recipes/resolve';
import { DEVICE_ICONS, DEVICE_LABELS, DEVICE_TINTS } from '../shared/labels';

type Row = { key: string; title: string; device: Section['steps'][number]['device']; parallel: boolean; groupStart: boolean };

function rowsOf(sections: readonly Section[]): Row[] {
  return sections.flatMap((section, s) =>
    section.steps.map((step, i) => {
      const previous = section.steps[i - 1];
      const next = section.steps[i + 1];
      const group = step.parallelGroup;
      const parallel =
        group !== undefined && (previous?.parallelGroup === group || next?.parallelGroup === group);
      return {
        key: `${String(s)}-${String(i)}`,
        title: step.title,
        device: step.device,
        parallel,
        groupStart: parallel && previous?.parallelGroup !== group,
      };
    }),
  );
}

// A map of the plan before cooking: which device does what, and which steps overlap.
export function StepOverview({ sections, parallelSections }: { sections: readonly Section[]; parallelSections: boolean }) {
  const rows = rowsOf(sections);
  return (
    <section aria-labelledby="overview-heading" className={`space-y-2 ${CARD}`}>
      <h2 id="overview-heading" className="text-lg font-semibold">{`Plan · ${String(rows.length)} pasos`}</h2>
      {parallelSections && (
        <p className="text-sm text-muted">La proteína se prepara mientras se cocina la sopa.</p>
      )}
      <ol className="space-y-1">
        {rows.map((row, index) => {
          const Icon = DEVICE_ICONS[row.device];
          const tint = DEVICE_TINTS[row.device];
          return (
            <li key={row.key}>
              {row.groupStart && <p className="mt-2 text-xs font-semibold tracking-wide text-sky-ink uppercase">En paralelo</p>}
              <div className={`flex items-center gap-3 py-1 ${row.parallel ? 'border-l-4 border-sky pl-3' : ''}`}>
                <span className="w-5 shrink-0 text-right text-sm text-muted tabular-nums">{index + 1}</span>
                <span
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tint.fill} ${tint.ink}`}
                  title={DEVICE_LABELS[row.device]}
                >
                  <Icon aria-label={DEVICE_LABELS[row.device]} size={16} />
                </span>
                <span>{row.title}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
