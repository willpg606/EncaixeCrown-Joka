import { useEffect, useState } from 'react';
import { criarBackup, getBaseStatus, restaurarBackup, uploadBase } from '../services/api';

function ImportarBase() {
  const [arquivo, setArquivo] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const validacao = status?.validation;
  const backups = status?.backups?.items || [];

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

  const handleBackup = async () => {
    setLoading(true);
    setFeedback(null);

    try {
      const response = await criarBackup();
      setFeedback({
        type: 'success',
        message: `${response.message} Arquivo: ${response.backup.fileName}`
      });
      await carregarStatus();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Não foi possível criar o backup.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreBackup = async (fileName) => {
    const confirmar = window.confirm(`Restaurar o backup ${fileName}? Os dados atuais do sistema serão substituídos.`);

    if (!confirmar) {
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const response = await restaurarBackup(fileName);
      setFeedback({
        type: 'success',
        message: `${response.message} Arquivo restaurado: ${response.restored.fileName}`
      });
      await carregarStatus();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Não foi possível restaurar o backup.'
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
          <button className="btn-secondary" type="button" onClick={handleBackup} disabled={loading}>
            {loading ? 'Aguarde...' : 'Criar Backup'}
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

        <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-900">Validação da base</p>
          <p className="mt-2 text-sm text-slate-500">
            A importação agora verifica colunas obrigatórias, duplicidades de ID e ausência de dados operacionais.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Colunas ausentes</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {validacao?.missingColumns?.length ? validacao.missingColumns.join(', ') : 'Nenhuma'}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">IDs duplicados</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {validacao?.resumo?.duplicados || 0}
              </p>
            </div>
          </div>
        </div>
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
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Armazenamento</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {status?.storage?.type ? status.storage.type.toUpperCase() : 'Local'}
            </p>
            {status?.storage?.path && (
              <p className="mt-2 break-all text-xs text-slate-500">{status.storage.path}</p>
            )}
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Pasta de backups</p>
            <p className="mt-2 break-all text-xs font-semibold text-slate-900">
              {status?.backups?.directory || 'Ainda não disponível'}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Última importação</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {status?.importedAt ? new Date(status.importedAt).toLocaleString('pt-BR') : 'Ainda não importada'}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Linhas analisadas</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{validacao?.resumo?.totalLinhas || 0}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Linhas válidas</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-600">{validacao?.resumo?.totalValidas || 0}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Sem rota / horário / ponto</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {validacao?.resumo?.semRota || 0} / {validacao?.resumo?.semHorario || 0} / {validacao?.resumo?.semPonto || 0}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Sem ID / funcionário</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {validacao?.resumo?.semId || 0} / {validacao?.resumo?.semFuncionario || 0}
            </p>
          </div>

          {validacao?.duplicateIds?.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-amber-600">Duplicidades encontradas</p>
              <div className="mt-3 max-h-40 space-y-2 overflow-auto text-sm text-amber-900">
                {validacao.duplicateIds.slice(0, 10).map((item) => (
                  <div key={`${item.id}-${item.linha}`} className="rounded-xl bg-white/70 px-3 py-2">
                    Linha {item.linha} • {item.funcionario} • {item.id}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Últimos backups</p>

            <div className="mt-3 space-y-2">
              {backups.length === 0 && (
                <div className="rounded-xl bg-white/70 px-3 py-2 text-sm text-slate-500">
                  Nenhum backup criado ainda.
                </div>
              )}

              {backups.map((item) => (
                <div key={item.path} className="rounded-xl bg-white/80 px-3 py-2">
                  <p className="text-sm font-semibold text-slate-900">{item.fileName}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(item.createdAt).toLocaleString('pt-BR')} • {(item.size / 1024).toFixed(1)} KB
                  </p>
                  <div className="mt-3">
                    <button
                      type="button"
                      className="rounded-full bg-amber-100 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-200"
                      onClick={() => handleRestoreBackup(item.fileName)}
                      disabled={loading}
                    >
                      Restaurar backup
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ImportarBase;
