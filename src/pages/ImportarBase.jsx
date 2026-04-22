import { useEffect, useState } from 'react';
import { getBaseStatus, uploadBase } from '../services/api';

function ImportarBase() {
  const [arquivo, setArquivo] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const carregarStatus = async () => {
    const response = await getBaseStatus();
    setStatus(response);
  };

  useEffect(() => {
    carregarStatus();
  }, []);

  const handleSubmit = async () => {
    if (!arquivo) {
      setFeedback({ type: 'error', message: 'Selecione um arquivo .xlsx para continuar.' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const response = await uploadBase(arquivo);
      setFeedback({
        type: 'success',
        message: `${response.totalRegistros} registros importados com sucesso.`
      });
      setArquivo(null);
      await carregarStatus();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Não foi possível importar a base.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="card">
        <p className="text-sm font-medium text-brand-600">Importação</p>
        <h3 className="mt-2 text-2xl font-semibold text-ink">Base Excel</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Faça upload do arquivo `.xlsx` contendo as colunas ID, ROTA, HORÁRIO EMBARQUE, PONTO DE EMBARQUE e FUNCIONÁRIO.
        </p>

        <label className="mt-6 block text-sm font-medium text-slate-700">
          Arquivo da base
          <input
            className="field cursor-pointer"
            type="file"
            accept=".xlsx"
            onChange={(event) => setArquivo(event.target.files?.[0] || null)}
          />
        </label>

        <div className="mt-6 flex gap-3">
          <button className="btn-primary" type="button" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Importando...' : 'Importar Base'}
          </button>
        </div>

        {feedback && (
          <div
            className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-medium ${
              feedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            {feedback.message}
          </div>
        )}
      </section>

      <section className="card">
        <p className="text-sm font-medium text-brand-600">Status atual</p>
        <h3 className="mt-2 text-xl font-semibold text-ink">Base carregada</h3>

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Arquivo</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{status?.fileName || 'Nenhum arquivo importado'}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Registros</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{status?.totalRegistros || 0}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Última importação</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {status?.importedAt ? new Date(status.importedAt).toLocaleString('pt-BR') : 'Ainda não importada'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ImportarBase;
