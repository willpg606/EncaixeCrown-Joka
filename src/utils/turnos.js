export function obterClasseTurno(turno = '') {
  const mapa = {
    A: 'bg-sky-100 text-sky-700 ring-sky-200',
    B: 'bg-violet-100 text-violet-700 ring-violet-200',
    C: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    D: 'bg-amber-100 text-amber-700 ring-amber-200',
    ADM: 'bg-slate-200 text-slate-700 ring-slate-300'
  };

  return mapa[String(turno).trim().toUpperCase()] || 'bg-slate-100 text-slate-600 ring-slate-200';
}
