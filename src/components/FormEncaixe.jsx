import { useMemo, useState } from 'react';
import { descreverEscalaPorData } from '../utils/escala';

function FormEncaixe({
  form,
  onChange,
  onSubmit,
  onClear,
  loading,
  lineCount,
  errorCount,
  buscaNome,
  onBuscaNomeChange,
  turnoBusca,
  onTurnoBuscaChange,
  sugestoes,
  loadingSugestoes,
  onAdicionarSugestao,
  solicitantes = [],
  turnosDisponiveis = ['A', 'B', 'C', 'D', 'ADM']
}) {
  const [filtroSolicitante, setFiltroSolicitante] = useState('');
  const solicitantesOrdenados = useMemo(
    () => [...solicitantes].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [solicitantes]
  );
  const solicitantesFiltrados = useMemo(() => {
    const termo = filtroSolicitante.trim().toLowerCase();

    if (!termo) {
      return solicitantesOrdenados;
    }

    return solicitantesOrdenados.filter((item) => item.toLowerCase().includes(termo));
  }, [filtroSolicitante, solicitantesOrdenados]);

  return (
    <div className="space-y-6">
      <section className="card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-brand-600">Card 1</p>
            <h3 className="text-xl font-semibold text-ink">Dados</h3>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            obrigatório
          </span>
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
              className={`field mt-3 ${form.solicitante ? 'border-brand-500 bg-brand-50 ring-4 ring-brand-100' : ''}`}
              name="solicitante"
              value={form.solicitante}
              onChange={onChange}
            >
              <option value="">Selecione um solicitante</option>
              {solicitantesFiltrados.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <span className="mt-2 block text-xs font-normal text-slate-400">
              Lista em ordem alfabética com filtro rápido. {form.solicitante ? `Selecionado: ${form.solicitante}.` : 'Escolha um solicitante cadastrado no sistema.'}
            </span>
          </label>

          <label className="text-sm font-medium text-slate-700">
            Data do Encaixe
            <input
              className="field"
              type="date"
              name="dataEncaixe"
              max="2100-12-31"
              value={form.dataEncaixe}
              onChange={onChange}
            />
            <span className="mt-2 block text-xs font-normal text-slate-400">
              Use como data padrão do lote. Quando precisar misturar datas, informe na linha: `dd/mm/aaaa | Nome - Turno`.
            </span>
            <span className="mt-2 block text-xs font-semibold text-brand-600">
              {descreverEscalaPorData(form.dataEncaixe)}
            </span>
          </label>
        </div>
      </section>

      <section className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-600">Card 2</p>
            <h3 className="text-xl font-semibold text-ink">Entrada em Lote</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Cole uma linha por colaborador no formato <strong>Nome - Turno</strong> ou <strong>dd/mm/aaaa | Nome - Turno</strong>. Tambem pode colar linhas vindas do Excel com colunas.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-100 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Linhas</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{lineCount}</p>
            </div>
            <div className="rounded-2xl bg-rose-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.22em] text-rose-400">Erros</p>
              <p className="mt-1 text-lg font-semibold text-rose-600">{errorCount}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Busca assistida na base</p>
              <p className="mt-1 text-sm text-slate-500">
                Digite nome ou parte do nome para localizar combinações já existentes e adicionar com um clique.
              </p>
            </div>
            <div className="text-xs uppercase tracking-[0.22em] text-slate-400">assertivo</div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_220px]">
            <input
              className="field mt-0"
              type="text"
              value={buscaNome}
              onChange={onBuscaNomeChange}
              placeholder="Ex.: Lucas, Oliveira, João Silva"
            />

            <label className="text-sm font-medium text-slate-700">
              Turno Encaixe
              <select className="field mt-2" value={turnoBusca} onChange={onTurnoBuscaChange}>
                {turnosDisponiveis.map((turno) => (
                  <option key={turno} value={turno}>
                    {turno}
                  </option>
                ))}
              </select>
              <span className="mt-2 block text-xs font-normal text-slate-400">
                Lista liberada automaticamente conforme a escala da data escolhida.
              </span>
            </label>
          </div>

          <div className="mt-4 max-h-72 overflow-auto rounded-2xl border border-slate-200 bg-white">
            {loadingSugestoes && (
              <div className="px-4 py-6 text-sm text-slate-400">Buscando colaboradores na base...</div>
            )}

            {!loadingSugestoes && buscaNome.trim().length < 2 && (
              <div className="px-4 py-6 text-sm text-slate-400">
                Digite pelo menos 2 caracteres para gerar sugestões.
              </div>
            )}

            {!loadingSugestoes && buscaNome.trim().length >= 2 && sugestoes.length === 0 && (
              <div className="px-4 py-6 text-sm text-slate-400">Nenhum colaborador encontrado para essa busca.</div>
            )}

            {!loadingSugestoes &&
              sugestoes.map((item) => (
                <button
                  key={`${item.id}-${item.turno}`}
                  type="button"
                  className="flex w-full items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 text-left last:border-b-0 hover:bg-slate-50"
                  onClick={() => onAdicionarSugestao(item)}
                >
                  <div>
                    <p className="font-semibold text-slate-900">{item.nome}</p>
                    <p className="mt-1 text-sm text-slate-500">Selecionar com turno de encaixe {turnoBusca}.</p>
                  </div>
                  <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
                    Adicionar
                  </span>
                </button>
              ))}
          </div>
        </div>

        <label className="mt-6 block text-sm font-medium text-slate-700">
          Colar nomes + turnos
          <textarea
            className="field min-h-[240px] resize-y"
            name="rawInput"
            value={form.rawInput}
            onChange={onChange}
            placeholder={'22/04/2026 | João Silva - A\n23/04/2026 | Maria Souza - B\nCarlos Lima - ADM'}
          />
        </label>

        <div className="mt-6 flex flex-wrap gap-3">
          <button className="btn-primary" type="button" onClick={onSubmit} disabled={loading}>
            {loading ? 'Processando...' : 'Processar Encaixes'}
          </button>
          <button className="btn-secondary" type="button" onClick={onClear} disabled={loading}>
            Limpar
          </button>
        </div>
      </section>
    </div>
  );
}

export default FormEncaixe;
