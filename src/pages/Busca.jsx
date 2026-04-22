import { useState } from 'react';
import TabelaResultado from '../components/TabelaResultado';
import { buscarPorData } from '../services/api';
import {
  exportarResultadosExcel,
  exportarResultadosPdf,
  formatarResultadosParaCopia
} from '../services/parser';
import { formatarDataBR } from '../utils/formatar';

function ResumoLista({ titulo, itens, emptyText }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-slate-900">{titulo}</h4>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
          {itens.length} grupos
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {itens.length === 0 && <p className="text-sm text-slate-400">{emptyText}</p>}

        {itens.map((item) => (
          <div key={`${titulo}-${item.chave}`} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
            <p className="text-sm font-medium text-slate-900">{item.chave}</p>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
              {item.total}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Busca() {
  const turnos = ['', 'A', 'B', 'C', 'D', 'ADM'];
  const [dataBusca, setDataBusca] = useState(new Date().toISOString().split('T')[0]);
  const [turnoBusca, setTurnoBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const handleBuscar = async () => {
    setLoading(true);
    setFeedback(null);

    try {
      const response = await buscarPorData(dataBusca, turnoBusca);
      setResultados(response.resultados || []);
      setResumo(response);
      setFeedback({
        type: 'success',
        message: `${response.totalResultados} encaixes encontrados em ${formatarDataBR(response.data)}${turnoBusca ? ` para o turno ${turnoBusca}` : ''}.`
      });
    } catch (error) {
      setResultados([]);
      setResumo(null);
      setFeedback({
        type: 'error',
        message: error.message || 'Não foi possível buscar os encaixes pela data informada.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    exportarResultadosExcel(resultados);
    setFeedback({ type: 'success', message: 'Arquivo Excel gerado com sucesso.' });
  };

  const handleExportPdf = () => {
    exportarResultadosPdf(resultados);
    setFeedback({ type: 'success', message: 'Arquivo PDF gerado com sucesso.' });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(formatarResultadosParaCopia(resultados));
    setFeedback({ type: 'success', message: 'Resultado copiado para a área de transferência.' });
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`rounded-[24px] border px-5 py-4 text-sm font-medium ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <section className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-600">Busca</p>
            <h3 className="text-2xl font-semibold text-ink">Busca unificada por data</h3>
            <p className="mt-2 text-sm text-slate-500">
              Consulte todos os encaixes registrados para o dia solicitado, mesmo quando vieram de pedidos diferentes.
            </p>
          </div>

          {resumo && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-center">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Encaixes</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{resumo.totalResultados}</p>
              </div>
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-center">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Lotes</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{resumo.totalLotes}</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-[260px_220px_auto]">
          <label className="text-sm font-medium text-slate-700">
            Data solicitada
            <input
              className="field"
              type="date"
              value={dataBusca}
              onChange={(event) => setDataBusca(event.target.value)}
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Turno
            <select className="field" value={turnoBusca} onChange={(event) => setTurnoBusca(event.target.value)}>
              {turnos.map((turno) => (
                <option key={turno || 'todos'} value={turno}>
                  {turno || 'Todos'}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end gap-3">
            <button className="btn-primary" type="button" onClick={handleBuscar} disabled={loading}>
              {loading ? 'Buscando...' : 'Buscar encaixes'}
            </button>
          </div>
        </div>
      </section>

      {resumo?.resumoDia && (
        <section className="card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-brand-600">Resumo do dia</p>
              <h3 className="text-2xl font-semibold text-ink">
                Visão consolidada de {formatarDataBR(resumo.data)}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Totais organizados para conferência rápida por turno, rota e solicitante.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-center">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Total</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{resumo.totalResultados}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-center">
                <p className="text-xs uppercase tracking-[0.22em] text-emerald-500">OK</p>
                <p className="mt-1 text-lg font-semibold text-emerald-700">{resumo.resumoDia.totalOk}</p>
              </div>
              <div className="rounded-2xl bg-rose-50 px-4 py-3 text-center">
                <p className="text-xs uppercase tracking-[0.22em] text-rose-500">Erros</p>
                <p className="mt-1 text-lg font-semibold text-rose-700">{resumo.resumoDia.totalErros}</p>
              </div>
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-center">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Lotes</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{resumo.totalLotes}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            <ResumoLista
              titulo="Por turno"
              itens={resumo.resumoDia.porTurno || []}
              emptyText="Nenhum turno encontrado para este filtro."
            />
            <ResumoLista
              titulo="Por rota"
              itens={resumo.resumoDia.porRota || []}
              emptyText="Nenhuma rota encontrada para este filtro."
            />
            <ResumoLista
              titulo="Por solicitante"
              itens={resumo.resumoDia.porSolicitante || []}
              emptyText="Nenhum solicitante encontrado para este filtro."
            />
          </div>
        </section>
      )}

      <TabelaResultado
        resultados={resultados}
        loading={loading}
        onExportExcel={handleExportExcel}
        onExportPdf={handleExportPdf}
        onCopy={handleCopy}
      />
    </div>
  );
}

export default Busca;
