import { useEffect, useState } from 'react';
import { getOutlookConfig, salvarOutlookConfig, validarOutlookConfig } from '../services/api';

const initialState = {
  enabled: false,
  tenantId: '',
  clientId: '',
  clientSecret: '',
  mailbox: '',
  folder: 'Caixa de Entrada',
  subjectFilter: 'Encaixe',
  senderFilter: '',
  extractMode: 'body',
  markAsProcessed: false,
  clientSecretConfigured: false,
  readyToConnect: false,
  pendingItems: [],
  lastValidatedAt: null
};

function Outlook() {
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const carregar = async () => {
    setLoading(true);

    try {
      const response = await getOutlookConfig();
      setForm((prev) => ({ ...prev, ...response.outlook }));
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Não foi possível carregar a estrutura do Outlook.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSalvar = async () => {
    setSaving(true);
    setFeedback(null);

    try {
      const response = await salvarOutlookConfig(form);
      setForm((prev) => ({ ...prev, ...response.outlook }));
      setFeedback({ type: 'success', message: response.message });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Não foi possível salvar a estrutura do Outlook.' });
    } finally {
      setSaving(false);
    }
  };

  const handleValidar = async () => {
    setSaving(true);
    setFeedback(null);

    try {
      const response = await validarOutlookConfig();
      setForm((prev) => ({ ...prev, ...response.outlook }));
      setFeedback({ type: 'success', message: response.message });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'A estrutura do Outlook ainda não está pronta.' });
    } finally {
      setSaving(false);
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-600">Integração futura</p>
            <h3 className="mt-2 text-2xl font-semibold text-ink">Estrutura do Outlook corporativo</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Esta tela deixa o sistema pronto para integrar com Microsoft Graph depois. A configuração fica salva, mas ainda não acessa os e-mails reais sem a etapa de credenciais Microsoft 365.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-center">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Status</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {form.readyToConnect ? 'Pronto' : 'Pendente'}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-center">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Pasta</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{form.folder || 'Inbox'}</p>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-center">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Validação</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {form.lastValidatedAt ? new Date(form.lastValidatedAt).toLocaleString('pt-BR') : 'Ainda não validada'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="card">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              ID do locatário
              <input className="field" name="tenantId" value={form.tenantId} onChange={handleChange} />
            </label>

            <label className="text-sm font-medium text-slate-700">
              ID do aplicativo
              <input className="field" name="clientId" value={form.clientId} onChange={handleChange} />
            </label>

            <label className="text-sm font-medium text-slate-700 md:col-span-2">
              Segredo do aplicativo
              <input
                className="field"
                type="password"
                name="clientSecret"
                value={form.clientSecret}
                onChange={handleChange}
                placeholder={form.clientSecretConfigured ? 'Segredo configurado. Digite novamente só se quiser trocar.' : ''}
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Caixa de e-mail
              <input className="field" name="mailbox" value={form.mailbox} onChange={handleChange} placeholder="ex.: transportes@empresa.com" />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Pasta
              <input className="field" name="folder" value={form.folder} onChange={handleChange} />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Filtro por assunto
              <input className="field" name="subjectFilter" value={form.subjectFilter} onChange={handleChange} />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Filtro por remetente
              <input className="field" name="senderFilter" value={form.senderFilter} onChange={handleChange} placeholder="ex.: crown@empresa.com" />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Extração
              <select className="field" name="extractMode" value={form.extractMode} onChange={handleChange}>
                <option value="body">Corpo do e-mail</option>
                <option value="attachment">Anexo ou planilha</option>
                <option value="mixed">Corpo + anexo</option>
              </select>
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              <input type="checkbox" name="enabled" checked={form.enabled} onChange={handleChange} />
              Habilitar integração Outlook quando a conexão real estiver pronta
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              <input type="checkbox" name="markAsProcessed" checked={form.markAsProcessed} onChange={handleChange} />
              Marcar e-mail como processado depois da leitura real
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button className="btn-primary" type="button" onClick={handleSalvar} disabled={saving || loading}>
              {saving ? 'Salvando...' : 'Salvar estrutura'}
            </button>
            <button className="btn-secondary" type="button" onClick={handleValidar} disabled={saving || loading}>
              Validar preparação
            </button>
          </div>
        </section>

        <section className="card">
          <p className="text-sm font-medium text-brand-600">Prontidão</p>
          <h3 className="mt-2 text-xl font-semibold text-ink">O que já fica pronto</h3>

          <div className="mt-5 space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Pendências</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {form.pendingItems?.length ? form.pendingItems.join(', ') : 'Nenhuma pendência estrutural'}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              O sistema já fica preparado para:
              <br />ler uma caixa de e-mail específica
              <br />filtrar por pasta, assunto e remetente
              <br />definir o modo de extração
              <br />ativar a conexão Microsoft depois
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              Próxima etapa real:
              <br />1. Registrar o app no Azure
              <br />2. Liberar permissões Microsoft Graph
              <br />3. Conectar autenticação e leitura da caixa
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Outlook;
