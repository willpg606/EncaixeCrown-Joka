import { useEffect, useMemo, useState } from 'react';
import { atualizarHistorico, excluirHistorico, getHistory, getSolicitantes } from '../services/api';
import { exportarHistoricoExcel, exportarHistoricoPdf } from '../services/parser';
import { formatarDataBR, formatarHorario } from '../utils/formatar';
import { obterClasseTurno } from '../utils/turnos';

const emptyEdit = {
  id: '',
  solicitante: '',
  dataEncaixe: '',
  rawInput: ''
};

const formatarResumoDatas = (item) => {
  if (item?.datasEncaixe?.length > 1) {
    return 'Múltiplas datas';
  }

  if (item?.dataEncaixe) {
    return formatarDataBR(item.dataEncaixe);
  }

  if (item?.dataPadrao) {
    return `${formatarDataBR(item.dataPadrao)} (padrão)`;
  }

  return '-';
};

function Historico() {
  const [historico, setHistorico] = useState([]);
  const [solicitantes, setSolicitantes] = useState([]);
  const [filtroSolicitante, setFiltroSolicitante] = useState('');
  const [selecionado, setSelecionado] = useState(null);
  const [editando, setEditando] = useState(emptyEdit);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const carregarHistorico = async (idPreferido) => {
    const data = await getHistory();
    setHistorico(data);

    if (data.length === 0) {
      setSelecionado(null);
      return;
    }

    const alvo = data.find((item) => item.id === idPreferido) || data[0];
    setSelecionado(alvo);
  };

  useEffect(() => {
    carregarHistorico();
    const carregarSolicitantes = async () => {
      try {
        const response = await getSolicitantes();
        setSolicitantes(response.solicitantes || []);
      } catch {
        setSolicitantes([]);
      }
    };

    carregarSolicitantes();
  }, []);

  const solicitantesFiltrados = useMemo(() => {
    const termo = filtroSolicitante.trim().toLowerCase();

    if (!termo) {
      return solicitantes;
    }

    return solicitantes.filter((item) => item.toLowerCase().includes(termo));
  }, [filtroSolicitante, solicitantes]);

  const abrirEdicao = (item) => {
    setFiltroSolicitante(item.solicitante || '');
    setEditando({
      id: item.id,
      solicitante: item.solicitante,
      dataEncaixe: item.dataEncaixe,
      rawInput: item.rawInput || item.resultados.map((resultado) => `${resultado.colaborador} - ${resultado.turnoEncaixe}`).join('\n')
    });
  };

  const fecharEdicao = () => {
    setFiltroSolicitante('');
    setEditando(emptyEdit);
  };

  const handleSalvarEdicao = async () => {
    setSalvando(true);
    setFeedback(null);

    try {
      const atualizado = await atualizarHistorico(editando.id, {
        solicitante: editando.solicitante,
        dataEncaixe: editando.dataEncaixe,
        rawInput: editando.rawInput
      });

      await carregarHistorico(atualizado.id);
      setFeedback({ type: 'success', message: 'Lote atualizado com sucesso.' });
      fecharEdicao();
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Não foi possível atualizar o lote.' });
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (item) => {
    const confirmar = window.confirm(`Excluir o lote de ${item.solicitante} em ${formatarDataBR(item.dataEncaixe)}?`);

    if (!confirmar) {
      return;
    }

    try {
      await excluirHistorico(item.id);
      await carregarHistorico(selecionado?.id === item.id ? null : selecionado?.id);
      setFeedback({ type: 'success', message: 'Lote excluído com sucesso.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Não foi possível excluir o lote.' });
    }
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

      <div className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-600">Histórico</p>
            <h3 className="mt-2 text-2xl font-semibold text-ink">Lotes processados</h3>
            <p className="mt-2 text-sm text-slate-500">
              Consulte o que foi solicitado, abra o detalhe, ajuste dados operacionais e remova lotes quando necessário.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-success"
              onClick={() => exportarHistoricoExcel(selecionado)}
              disabled={!selecionado?.resultados?.length}
            >
              Exportar Excel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => exportarHistoricoPdf(selecionado)}
              disabled={!selecionado?.resultados?.length}
            >
              Exportar PDF
            </button>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
          <div className="max-h-[420px] overflow-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {['Criado em', 'Solicitante', 'Data do Encaixe', 'Processados', 'Erros', 'Ações'].map((item) => (
                    <th key={item} className="px-4 py-3 text-center font-semibold">
                      {item}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {historico.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                      O histórico será preenchido após os primeiros processamentos.
                    </td>
                  </tr>
                )}

                {historico.map((item) => (
                  <tr key={item.id} className={selecionado?.id === item.id ? 'bg-brand-50' : ''}>
                    <td className="px-4 py-3 text-center">{new Date(item.createdAt).toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.solicitante}</td>
                    <td className="px-4 py-3 text-center">{formatarResumoDatas(item)}</td>
                    <td className="px-4 py-3 text-center">{item.totalProcessados}</td>
                    <td className="px-4 py-3 text-center text-rose-600">{item.totalErros}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                          onClick={() => setSelecionado(item)}
                        >
                          Exibir
                        </button>
                        <button
                          type="button"
                          className="rounded-full bg-amber-100 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-200"
                          onClick={() => abrirEdicao(item)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="rounded-full bg-rose-100 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-200"
                          onClick={() => handleExcluir(item)}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editando.id && (
        <div className="card border-amber-200 bg-amber-50/50">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-amber-600">Editar lote</p>
              <h3 className="mt-2 text-2xl font-semibold text-ink">Atualizar solicitação salva</h3>
            </div>
            <button type="button" className="btn-secondary" onClick={fecharEdicao}>
              Cancelar edição
            </button>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Solicitante
              <input
                className="field"
                type="text"
                value={filtroSolicitante}
                onChange={(event) => setFiltroSolicitante(event.target.value)}
                placeholder="Buscar solicitante"
              />
              <select
                className="field mt-3"
                value={editando.solicitante}
                onChange={(event) =>
                  setEditando((prev) => ({ ...prev, solicitante: event.target.value }))
                }
              >
                <option value="">Selecione um solicitante</option>
                {solicitantesFiltrados.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700">
              Data do Encaixe
              <input
                className="field"
                type="date"
                value={editando.dataEncaixe}
                onChange={(event) =>
                  setEditando((prev) => ({ ...prev, dataEncaixe: event.target.value }))
                }
              />
              <span className="mt-2 block text-xs font-normal text-slate-400">
                Use esta data como padrão. Se a lista tiver várias datas, mantenha as datas diretamente em cada linha.
              </span>
            </label>
          </div>

          <label className="mt-5 block text-sm font-medium text-slate-700">
            Lista em lote
            <textarea
              className="field min-h-[220px] resize-y"
              value={editando.rawInput}
              onChange={(event) => setEditando((prev) => ({ ...prev, rawInput: event.target.value }))}
            />
          </label>

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="btn-primary" onClick={handleSalvarEdicao} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar alterações'}
            </button>
            <button type="button" className="btn-secondary" onClick={fecharEdicao} disabled={salvando}>
              Fechar
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-600">Detalhe do lote</p>
            <h3 className="mt-2 text-2xl font-semibold text-ink">
              {selecionado ? `Solicitação de ${selecionado.solicitante}` : 'Nenhum lote selecionado'}
            </h3>
          </div>
          {selecionado && (
            <div className="text-sm text-slate-500">
              {formatarResumoDatas(selecionado)} • {selecionado.totalProcessados} processados
            </div>
          )}
        </div>

        <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
          <div className="max-h-[520px] overflow-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="sticky top-0 bg-slate-50 text-slate-500">
                <tr>
                  {[
                    'Data do Encaixe',
                    'Colaborador',
                    'Turno Encaixe',
                    'Horário Embarque',
                    'Ponto Embarque',
                    'Rota',
                    'Solicitante',
                    'Status'
                  ].map((item) => (
                    <th key={item} className="px-4 py-3 text-center font-semibold">
                      {item}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {!selecionado?.resultados?.length && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                      Selecione um lote no histórico para ver a lista solicitada.
                    </td>
                  </tr>
                )}

                {selecionado?.resultados?.map((item) => (
                  <tr key={item.id} className={item.status === 'ok' ? 'bg-emerald-50/60' : 'bg-rose-50/70'}>
                    <td className="px-4 py-3 text-center">{formatarDataBR(item.dataEncaixe)}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.colaborador}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex min-w-[58px] items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${obterClasseTurno(item.turnoEncaixe)}`}
                      >
                        {item.turnoEncaixe}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{formatarHorario(item.horarioEmbarque)}</td>
                    <td className="px-4 py-3">{item.pontoEmbarque}</td>
                    <td className="px-4 py-3 text-center">{item.rota}</td>
                    <td className="px-4 py-3">{item.solicitante}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          item.status === 'ok'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {item.status === 'ok' ? 'OK' : 'ERRO'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Historico;
