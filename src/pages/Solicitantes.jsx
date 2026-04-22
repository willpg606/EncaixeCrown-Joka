import { useEffect, useMemo, useState } from 'react';
import {
  atualizarSolicitante,
  criarSolicitante,
  excluirSolicitante,
  getSolicitantes
} from '../services/api';

function Solicitantes() {
  const [solicitantes, setSolicitantes] = useState([]);
  const [novoNome, setNovoNome] = useState('');
  const [filtro, setFiltro] = useState('');
  const [editando, setEditando] = useState('');
  const [nomeEdicao, setNomeEdicao] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const carregar = async () => {
    const response = await getSolicitantes();
    setSolicitantes(response.solicitantes || []);
  };

  useEffect(() => {
    carregar();
  }, []);

  const listaFiltrada = useMemo(() => {
    const termo = filtro.trim().toLowerCase();

    if (!termo) {
      return solicitantes;
    }

    return solicitantes.filter((item) => item.toLowerCase().includes(termo));
  }, [filtro, solicitantes]);

  const handleCriar = async () => {
    if (!novoNome.trim()) {
      setFeedback({ type: 'error', message: 'Informe um nome para cadastrar.' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const response = await criarSolicitante(novoNome);
      setSolicitantes(response.solicitantes || []);
      setNovoNome('');
      setFeedback({ type: 'success', message: response.message });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Não foi possível cadastrar o solicitante.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarEdicao = async () => {
    if (!editando) {
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const response = await atualizarSolicitante(editando, nomeEdicao);
      setSolicitantes(response.solicitantes || []);
      setEditando('');
      setNomeEdicao('');
      setFeedback({ type: 'success', message: response.message });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Não foi possível atualizar o solicitante.' });
    } finally {
      setLoading(false);
    }
  };

  const handleExcluir = async (nome) => {
    const confirmar = window.confirm(`Excluir o solicitante ${nome}?`);

    if (!confirmar) {
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const response = await excluirSolicitante(nome);
      setSolicitantes(response.solicitantes || []);
      if (editando === nome) {
        setEditando('');
        setNomeEdicao('');
      }
      setFeedback({ type: 'success', message: response.message });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Não foi possível excluir o solicitante.' });
    } finally {
      setLoading(false);
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

      <section className="card">
        <p className="text-sm font-medium text-brand-600">Configuração</p>
        <h3 className="mt-2 text-2xl font-semibold text-ink">Solicitantes configuráveis</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Cadastre, edite e remova os nomes autorizados para solicitar encaixes. A lista é usada no Novo Encaixe e na edição do Histórico.
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_180px]">
          <label className="text-sm font-medium text-slate-700">
            Novo solicitante
            <input
              className="field"
              type="text"
              value={novoNome}
              onChange={(event) => setNovoNome(event.target.value)}
              placeholder="Ex.: Renato Martins"
            />
          </label>

          <div className="flex items-end">
            <button className="btn-primary w-full" type="button" onClick={handleCriar} disabled={loading}>
              {loading ? 'Salvando...' : 'Adicionar'}
            </button>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-600">Lista atual</p>
            <h3 className="text-xl font-semibold text-ink">Solicitantes cadastrados</h3>
          </div>
          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-center">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Total</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{solicitantes.length}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto]">
          <label className="text-sm font-medium text-slate-700">
            Buscar solicitante
            <input
              className="field"
              type="text"
              value={filtro}
              onChange={(event) => setFiltro(event.target.value)}
              placeholder="Digite parte do nome"
            />
          </label>

          <div className="flex items-end">
            <button className="btn-secondary" type="button" onClick={() => setFiltro('')}>
              Limpar filtro
            </button>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
          <div className="max-h-[460px] overflow-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {['Solicitante', 'Editar nome', 'Ações'].map((header) => (
                    <th key={header} className="px-4 py-3 text-center font-semibold">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {listaFiltrada.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-slate-400">
                      Nenhum solicitante encontrado para esse filtro.
                    </td>
                  </tr>
                )}

                {listaFiltrada.map((nome) => {
                  const estaEditando = editando === nome;

                  return (
                    <tr key={nome}>
                      <td className="px-4 py-3 text-center font-medium text-slate-900">{nome}</td>
                      <td className="px-4 py-3">
                        {estaEditando ? (
                          <input
                            className="field mt-0"
                            type="text"
                            value={nomeEdicao}
                            onChange={(event) => setNomeEdicao(event.target.value)}
                          />
                        ) : (
                          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center text-slate-400">
                            Clique em editar para alterar
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          {!estaEditando ? (
                            <button
                              type="button"
                              className="rounded-full bg-amber-100 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-200"
                              onClick={() => {
                                setEditando(nome);
                                setNomeEdicao(nome);
                              }}
                            >
                              Editar
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="rounded-full bg-emerald-100 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-200"
                                onClick={handleSalvarEdicao}
                              >
                                Salvar
                              </button>
                              <button
                                type="button"
                                className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                                onClick={() => {
                                  setEditando('');
                                  setNomeEdicao('');
                                }}
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className="rounded-full bg-rose-100 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-200"
                            onClick={() => handleExcluir(nome)}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Solicitantes;
