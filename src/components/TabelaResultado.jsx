import { formatarDataBR, formatarHorario } from '../utils/formatar';
import { obterClasseTurno } from '../utils/turnos';

function TabelaResultado({ resultados, loading, onExportExcel, onExportPdf, onCopy }) {
  return (
    <section className="card">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-600">Card 3</p>
          <h3 className="text-xl font-semibold text-ink">Resultado</h3>
          <p className="mt-2 text-sm text-slate-500">
            Tabela operacional pronta para conferência, cópia e exportação.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button className="btn-success" type="button" onClick={onExportExcel} disabled={!resultados.length}>
            Exportar Excel
          </button>
          <button className="btn-primary" type="button" onClick={onExportPdf} disabled={!resultados.length}>
            Exportar PDF
          </button>
          <button className="btn-secondary" type="button" onClick={onCopy} disabled={!resultados.length}>
            Copiar para área de transferência
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
        <div className="max-h-[460px] overflow-auto">
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
                  'Solicitante'
                ].map((header) => (
                  <th key={header} className="px-4 py-3 text-center font-semibold">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {!loading && resultados.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    Nenhum encaixe processado ainda.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    Buscando dados operacionais na base...
                  </td>
                </tr>
              )}

              {!loading &&
                resultados.map((item) => (
                  <tr
                    key={item.id}
                    className={item.status === 'ok' ? 'bg-emerald-50/60' : 'bg-rose-50/70'}
                  >
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
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default TabelaResultado;
