import { useEffect, useState } from 'react';
import StatCard from '../components/StatCard';
import { getInconsistencias } from '../services/api';
import { formatarDataBR, formatarHorario } from '../utils/formatar';

function ListaInconsistencia({ titulo, descricao, itens, tone = 'slate' }) {
  const toneClass = {
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700'
  }[tone];

  return (
    <section className="card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-ink">{titulo}</h3>
          <p className="mt-2 text-sm text-slate-500">{descricao}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClass}`}>
          {itens.length} itens
        </span>
      </div>

      <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200">
        <div className="max-h-[320px] overflow-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 text-center font-semibold">Colaborador</th>
                <th className="px-4 py-3 text-center font-semibold">Turno</th>
                <th className="px-4 py-3 text-center font-semibold">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {itens.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                    Nenhuma inconsistência neste grupo.
                  </td>
                </tr>
              )}

              {itens.map((item) => (
                <tr key={`${item.id}-${item.colaborador}`}>
                  <td className="px-4 py-3 font-medium text-slate-900">{item.colaborador}</td>
                  <td className="px-4 py-3 text-center">{item.turno || '-'}</td>
                  <td className="px-4 py-3 text-center text-slate-500">{item.id || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Inconsistencias() {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      setErro('');

      try {
        const response = await getInconsistencias();
        setDados(response);
      } catch (error) {
        setErro(error.message || 'Não foi possível carregar o painel de inconsistências.');
      } finally {
        setLoading(false);
      }
    };

    carregar();
  }, []);

  const resumo = dados?.resumo;
  const base = dados?.base;
  const faltas = base?.faltas;
  const historico = dados?.historico;
  const duplicados = base?.validation?.duplicateIds || [];

  return (
    <div className="space-y-6">
      <section className="card">
        <p className="text-sm font-medium text-brand-600">Conferência</p>
        <h3 className="mt-2 text-2xl font-semibold text-ink">Painel de inconsistências</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Acompanhe problemas da base importada e encaixes não encontrados para agir mais rápido na correção.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="IDs duplicados"
            value={resumo?.duplicados || 0}
            hint="Ocorrências detectadas na importação"
            tone="danger"
          />
          <StatCard
            title="Sem rota / horário / ponto"
            value={`${resumo?.semRota || 0} / ${resumo?.semHorario || 0} / ${resumo?.semPonto || 0}`}
            hint="Campos operacionais faltando"
          />
          <StatCard
            title="Sem funcionário / turno"
            value={`${resumo?.semFuncionario || 0} / ${resumo?.semTurno || 0}`}
            hint="Dados incompletos na base"
          />
          <StatCard
            title="Não encontrados"
            value={resumo?.naoEncontrados || 0}
            hint="Resultados com erro no histórico"
            tone="primary"
          />
        </div>

        {erro && (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {erro}
          </div>
        )}

        {!erro && (
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-[24px] bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Base atual</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {base?.arquivo || 'Nenhuma base importada'}
              </p>
            </div>
            <div className="rounded-[24px] bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Última importação</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {base?.importedAt ? new Date(base.importedAt).toLocaleString('pt-BR') : 'Ainda não importada'}
              </p>
            </div>
            <div className="rounded-[24px] bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Colunas ausentes</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {base?.validation?.missingColumns?.length
                  ? base.validation.missingColumns.join(', ')
                  : 'Nenhuma'}
              </p>
            </div>
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <ListaInconsistencia
          titulo="Base sem rota"
          descricao="Colaboradores cadastrados sem rota operacional."
          itens={faltas?.semRota || []}
          tone="amber"
        />
        <ListaInconsistencia
          titulo="Base sem horário"
          descricao="Linhas que ainda não têm horário de embarque preenchido."
          itens={faltas?.semHorario || []}
          tone="amber"
        />
        <ListaInconsistencia
          titulo="Base sem ponto"
          descricao="Linhas sem ponto de embarque informado."
          itens={faltas?.semPonto || []}
          tone="amber"
        />
        <ListaInconsistencia
          titulo="Base sem funcionário ou turno"
          descricao="Registros com identificação incompleta para uso seguro na operação."
          itens={[...(faltas?.semFuncionario || []), ...(faltas?.semTurno || [])]}
          tone="rose"
        />
      </div>

      <section className="card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-600">Duplicidades</p>
            <h3 className="text-xl font-semibold text-ink">IDs repetidos na base</h3>
          </div>
          <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700">
            {duplicados.length} ocorrências
          </span>
        </div>

        <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
          <div className="max-h-[320px] overflow-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="sticky top-0 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-center font-semibold">Linha</th>
                  <th className="px-4 py-3 text-center font-semibold">Colaborador</th>
                  <th className="px-4 py-3 text-center font-semibold">ID duplicado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {duplicados.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                      Nenhum ID duplicado encontrado na última base importada.
                    </td>
                  </tr>
                )}

                {duplicados.map((item) => (
                  <tr key={`${item.id}-${item.linha}`}>
                    <td className="px-4 py-3 text-center">{item.linha}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.funcionario}</td>
                    <td className="px-4 py-3 text-center text-slate-500">{item.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-600">Histórico operacional</p>
            <h3 className="text-xl font-semibold text-ink">Encaixes não encontrados</h3>
            <p className="mt-2 text-sm text-slate-500">
              Lista unificada dos encaixes com erro para revisão rápida.
            </p>
          </div>
          <span className="rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700">
            {historico?.totalNaoEncontrados || 0} pendências
          </span>
        </div>

        <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
          <div className="max-h-[420px] overflow-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="sticky top-0 bg-slate-50 text-slate-500">
                <tr>
                  {['Data', 'Colaborador', 'Turno', 'Solicitante', 'Horário', 'Rota', 'Ponto'].map((header) => (
                    <th key={header} className="px-4 py-3 text-center font-semibold">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {!loading && !historico?.naoEncontrados?.length && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                      Nenhum encaixe inconsistente encontrado no histórico.
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                      Carregando inconsistências...
                    </td>
                  </tr>
                )}

                {!loading &&
                  (historico?.naoEncontrados || []).map((item) => (
                    <tr key={`${item.loteId}-${item.colaborador}-${item.dataEncaixe}`} className="bg-rose-50/60">
                      <td className="px-4 py-3 text-center">{formatarDataBR(item.dataEncaixe)}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.colaborador}</td>
                      <td className="px-4 py-3 text-center">{item.turnoEncaixe}</td>
                      <td className="px-4 py-3 text-center">{item.solicitante}</td>
                      <td className="px-4 py-3 text-center">{formatarHorario(item.horarioEmbarque)}</td>
                      <td className="px-4 py-3 text-center">{item.rota}</td>
                      <td className="px-4 py-3">{item.pontoEmbarque}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Inconsistencias;
