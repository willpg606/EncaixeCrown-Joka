import { useEffect, useState } from 'react';
import StatCard from '../components/StatCard';
import { getBaseStatus, getHistory } from '../services/api';

function Dashboard() {
  const [stats, setStats] = useState({
    totalRegistros: 0,
    importedAt: null,
    historico: []
  });

  useEffect(() => {
    const carregar = async () => {
      const [base, historico] = await Promise.all([getBaseStatus(), getHistory()]);
      setStats({
        totalRegistros: base.totalRegistros || 0,
        importedAt: base.importedAt,
        historico
      });
    };

    carregar();
  }, []);

  const totalProcessados = stats.historico.reduce((acc, item) => acc + item.totalProcessados, 0);
  const totalErros = stats.historico.reduce((acc, item) => acc + item.totalErros, 0);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Base carregada"
          value={stats.totalRegistros}
          hint={stats.importedAt ? `Atualizada em ${new Date(stats.importedAt).toLocaleString('pt-BR')}` : 'Nenhuma base importada'}
          tone="primary"
        />
        <StatCard
          title="Lotes processados"
          value={stats.historico.length}
          hint="Processamentos salvos no histórico"
        />
        <StatCard
          title="Colaboradores processados"
          value={totalProcessados}
          hint="Volume total de linhas tratadas"
          tone="success"
        />
        <StatCard
          title="Erros encontrados"
          value={totalErros}
          hint="Linhas com formato ou busca inválida"
          tone="danger"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="card">
          <p className="text-sm font-medium text-brand-600">Visão operacional</p>
          <h3 className="mt-2 text-2xl font-semibold text-ink">Fluxo pensado para rotina real</h3>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              'Importe a base Excel uma vez e mantenha a consulta pronta.',
              'Cole nomes e turnos em lote para processar com poucos cliques.',
              'Exporte ou copie a saída final para agir rápido na operação.'
            ].map((item) => (
              <div key={item} className="rounded-[24px] bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <p className="text-sm font-medium text-brand-600">Últimos lotes</p>
          <div className="mt-4 space-y-3">
            {stats.historico.length === 0 && (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                Nenhum processamento realizado ainda.
              </div>
            )}

            {stats.historico.slice(0, 5).map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">{item.solicitante}</p>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
                    {item.dataEncaixe}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {item.totalProcessados} processados • {item.totalErros} erros
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
