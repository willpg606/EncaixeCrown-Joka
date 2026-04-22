function StatCard({ title, value, hint, tone = 'default' }) {
  const toneClass = {
    default: 'from-white to-slate-50 text-slate-900',
    primary: 'from-brand-500 to-brand-700 text-white',
    success: 'from-emerald-500 to-emerald-700 text-white',
    danger: 'from-rose-500 to-rose-700 text-white'
  }[tone];

  return (
    <div className={`rounded-[28px] bg-gradient-to-br p-[1px] shadow-soft`}>
      <div className={`h-full rounded-[27px] bg-gradient-to-br ${toneClass} p-5`}>
        <p className="text-sm font-medium opacity-80">{title}</p>
        <p className="mt-4 text-3xl font-semibold">{value}</p>
        <p className="mt-2 text-sm opacity-80">{hint}</p>
      </div>
    </div>
  );
}

export default StatCard;
