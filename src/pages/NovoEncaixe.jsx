import { useEffect, useMemo, useRef, useState } from 'react';
import FormEncaixe from '../components/FormEncaixe';
import TabelaResultado from '../components/TabelaResultado';
import { buscarColaboradores, getSolicitantes, processarEncaixes } from '../services/api';
import {
  exportarResultadosExcel,
  exportarResultadosPdf,
  formatarResultadosParaCopia,
  parseInput
} from '../services/parser';
import { obterTurnosPorData } from '../utils/escala';

const initialState = {
  solicitante: '',
  dataEncaixe: new Date().toISOString().split('T')[0],
  rawInput: ''
};

function NovoEncaixe() {
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [loadingSugestoes, setLoadingSugestoes] = useState(false);
  const [resultados, setResultados] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [buscaNome, setBuscaNome] = useState('');
  const [turnoBusca, setTurnoBusca] = useState('A');
  const [sugestoes, setSugestoes] = useState([]);
  const [solicitantes, setSolicitantes] = useState([]);
  const resultRef = useRef(null);

  const preview = parseInput(form.rawInput, form.dataEncaixe);
  const turnosDisponiveis = useMemo(() => obterTurnosPorData(form.dataEncaixe), [form.dataEncaixe]);
  const parsedPreview = {
    lineCount: preview.length,
    errorCount: preview.filter((item) => !item.valido).length
  };

  useEffect(() => {
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

  useEffect(() => {
    if (resultados.length > 0) {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [resultados]);

  useEffect(() => {
    if (!turnosDisponiveis.includes(turnoBusca)) {
      setTurnoBusca(turnosDisponiveis[0] || 'A');
    }
  }, [turnoBusca, turnosDisponiveis]);

  useEffect(() => {
    const termo = buscaNome.trim();

    if (termo.length < 2) {
      setSugestoes([]);
      setLoadingSugestoes(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoadingSugestoes(true);

      try {
        const response = await buscarColaboradores(termo);
        setSugestoes(response);
      } catch {
        setSugestoes([]);
      } finally {
        setLoadingSugestoes(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [buscaNome]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleClear = () => {
    setForm(initialState);
    setResultados([]);
    setFeedback(null);
    setBuscaNome('');
    setTurnoBusca('A');
    setSugestoes([]);
  };

  const handleAdicionarSugestao = (item) => {
    const prefixoData = form.dataEncaixe ? `${form.dataEncaixe.split('-').reverse().join('/')} | ` : '';
    const novaLinha = `${prefixoData}${item.nome} - ${turnoBusca}`;

    setForm((prev) => ({
      ...prev,
      rawInput: prev.rawInput.trim() ? `${prev.rawInput.trim()}\n${novaLinha}` : novaLinha
    }));
    setBuscaNome('');
    setSugestoes([]);
    setFeedback({
      type: 'success',
      message: `${novaLinha} adicionado à entrada em lote.`
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setFeedback(null);

    try {
      const response = await processarEncaixes(form);
      setResultados(response.resultados);
      setFeedback({
        type: 'success',
        message: `${response.totalProcessados} linhas processadas com ${response.totalErros} erros.`
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Não foi possível processar os encaixes.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    const texto = formatarResultadosParaCopia(resultados);
    await navigator.clipboard.writeText(texto);
    setFeedback({ type: 'success', message: 'Resultado copiado para a área de transferência.' });
  };

  const handleExport = () => {
    exportarResultadosExcel(resultados, {
      titulo: 'CROWN ENCAIXES PRO',
      subtitulo: 'Resultado do processamento atual',
      dataReferencia: form.dataEncaixe ? form.dataEncaixe.split('-').reverse().join('/') : '',
      solicitante: form.solicitante,
      nomeArquivo: `encaixes-${form.dataEncaixe || 'lote-atual'}`
    });
    setFeedback({ type: 'success', message: 'Arquivo Excel gerado com sucesso.' });
  };

  const handleExportPdf = () => {
    exportarResultadosPdf(resultados, {
      titulo: 'CROWN ENCAIXES PRO',
      subtitulo: 'Resultado do processamento atual',
      dataReferencia: form.dataEncaixe ? form.dataEncaixe.split('-').reverse().join('/') : '',
      solicitante: form.solicitante,
      nomeArquivo: `encaixes-${form.dataEncaixe || 'lote-atual'}`
    });
    setFeedback({ type: 'success', message: 'Arquivo PDF gerado com sucesso.' });
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

      <FormEncaixe
        form={form}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onClear={handleClear}
        loading={loading}
        lineCount={parsedPreview.lineCount}
        errorCount={parsedPreview.errorCount}
        buscaNome={buscaNome}
        onBuscaNomeChange={(event) => setBuscaNome(event.target.value)}
        turnoBusca={turnoBusca}
        onTurnoBuscaChange={(event) => setTurnoBusca(event.target.value)}
        sugestoes={sugestoes}
        loadingSugestoes={loadingSugestoes}
        onAdicionarSugestao={handleAdicionarSugestao}
        solicitantes={solicitantes}
        turnosDisponiveis={turnosDisponiveis}
      />

      <div ref={resultRef}>
        <TabelaResultado
          resultados={resultados}
          loading={loading}
          onCopy={handleCopy}
          onExportExcel={handleExport}
          onExportPdf={handleExportPdf}
          cardTitle="Envio Dados"
        />
      </div>
    </div>
  );
}

export default NovoEncaixe;
