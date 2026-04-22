import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatarDataBR, formatarHorario } from '../utils/formatar';
import { gerarChave } from '../utils/normalizar';

const validShifts = new Set(['A', 'B', 'C', 'D', 'ADM']);

export function normalizarDataEntrada(valor = '') {
  const texto = String(valor).trim();

  if (!texto) {
    return '';
  }

  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }

  const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (br) {
    return `${br[3]}-${br[2]}-${br[1]}`;
  }

  return '';
}

function parseLinhaLote(linha = '', dataPadrao = '') {
  const colunas = linha.split('\t').map((item) => item.trim());

  if (colunas.length >= 4) {
    return {
      dataEncaixe: normalizarDataEntrada(colunas[0]) || dataPadrao,
      nome: colunas[1] || '',
      turno: String(colunas[3] || '').trim().toUpperCase()
    };
  }

  const pipeParts = linha.split('|').map((item) => item.trim()).filter(Boolean);
  const dataPipe = pipeParts.length >= 2 ? normalizarDataEntrada(pipeParts[0]) : '';

  if (dataPipe) {
    const restante = pipeParts.slice(1).join(' | ');
    const partes = restante.split(/\s*-\s*/);
    const turno = partes.pop()?.trim().toUpperCase() || '';

    return {
      dataEncaixe: dataPipe,
      nome: partes.join(' - ').trim(),
      turno
    };
  }

  const partes = linha.split(/\s*-\s*/);
  const turno = partes.pop()?.trim().toUpperCase() || '';

  return {
    dataEncaixe: dataPadrao,
    nome: partes.join(' - ').trim(),
    turno
  };
}

export function parseInput(rawInput = '', dataPadrao = '') {
  return rawInput
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean)
    .map((linha, index) => {
      const { dataEncaixe, nome, turno } = parseLinhaLote(linha, normalizarDataEntrada(dataPadrao));
      const turnoValido = validShifts.has(turno);
      const valido = Boolean(nome) && turnoValido && Boolean(dataEncaixe);

      return {
        linha: index + 1,
        dataEncaixe,
        nome,
        turno,
        chave: gerarChave(nome, turno),
        valido
      };
    });
}

export function gerarResultado(resultados = []) {
  return resultados.map((item) =>
    [
      formatarDataBR(item.dataEncaixe),
      item.colaborador,
      item.turnoEncaixe,
      formatarHorario(item.horarioEmbarque),
      item.pontoEmbarque,
      item.rota,
      item.solicitante
    ].join(' | ')
  );
}

export function formatarResultadosParaCopia(resultados = []) {
  return gerarResultado(resultados).join('\n');
}

function criarNomeSeguro(valor = '') {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'crown-encaixes-pro';
}

function obterResumoExportacao(resultados = [], contexto = {}) {
  const datas = [...new Set(resultados.map((item) => formatarDataBR(item.dataEncaixe)).filter(Boolean))];
  const solicitantes = [...new Set(resultados.map((item) => item.solicitante).filter(Boolean))];
  const rotas = [...new Set(resultados.map((item) => item.rota).filter(Boolean))];

  return {
    titulo: contexto.titulo || 'CROWN ENCAIXES PRO',
    subtitulo: contexto.subtitulo || 'Relatório operacional de encaixes',
    dataReferencia: contexto.dataReferencia || (datas.length === 1 ? datas[0] : datas.length > 1 ? 'Múltiplas datas' : '-'),
    solicitante: contexto.solicitante || (solicitantes.length === 1 ? solicitantes[0] : solicitantes.length > 1 ? 'Múltiplos solicitantes' : '-'),
    totalResultados: resultados.length,
    totalOk: resultados.filter((item) => item.status === 'ok').length,
    totalErros: resultados.filter((item) => item.status !== 'ok').length,
    totalRotas: rotas.filter((item) => item && item !== 'NÃO ENCONTRADO').length,
    emitidoEm: new Date().toLocaleString('pt-BR')
  };
}

function definirLarguras(worksheet, larguras = []) {
  worksheet['!cols'] = larguras.map((width) => ({ wch: width }));
}

function criarLinhasResumo(resumo) {
  return [
    ['Relatório', resumo.titulo],
    ['Descrição', resumo.subtitulo],
    ['Data de referência', resumo.dataReferencia],
    ['Solicitante', resumo.solicitante],
    ['Total exportado', resumo.totalResultados],
    ['Total OK', resumo.totalOk],
    ['Total erros', resumo.totalErros],
    ['Rotas válidas', resumo.totalRotas],
    ['Emitido em', resumo.emitidoEm]
  ];
}

function montarRowsExcel(resultados = []) {
  return resultados.map((item) => ({
    'Data do Encaixe': formatarDataBR(item.dataEncaixe),
    Colaborador: item.colaborador,
    'Turno Encaixe': item.turnoEncaixe,
    'Horário Embarque': formatarHorario(item.horarioEmbarque),
    'Ponto Embarque': item.pontoEmbarque,
    Rota: item.rota,
    Solicitante: item.solicitante,
    Status: item.status === 'ok' ? 'OK' : 'ERRO'
  }));
}

function nomeArquivoPadrao(contexto = {}, extensao = 'xlsx') {
  const base = criarNomeSeguro(contexto.nomeArquivo || contexto.titulo || 'crown-encaixes-pro');

  return `${base}.${extensao}`;
}

export function exportarResultadosExcel(resultados = [], contexto = {}) {
  const rows = montarRowsExcel(resultados);
  const resumo = obterResumoExportacao(resultados, contexto);

  const worksheet = XLSX.utils.json_to_sheet(rows);
  definirLarguras(worksheet, [16, 34, 16, 18, 42, 10, 22, 10]);
  const resumoSheet = XLSX.utils.aoa_to_sheet(criarLinhasResumo(resumo));
  definirLarguras(resumoSheet, [18, 42]);
  const workbook = XLSX.utils.book_new();

  workbook.Props = {
    Title: resumo.titulo,
    Subject: resumo.subtitulo,
    Author: 'CROWN ENCAIXES PRO',
    CreatedDate: new Date()
  };

  XLSX.utils.book_append_sheet(workbook, resumoSheet, 'Resumo');
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Encaixes');
  XLSX.writeFile(workbook, nomeArquivoPadrao(contexto, 'xlsx'));
}

function montarLinhasPdf(resultados = []) {
  return resultados.map((item) => [
    formatarDataBR(item.dataEncaixe),
    item.colaborador,
    item.turnoEncaixe,
    item.status === 'ok' ? 'EXTRA' : 'ERRO',
    formatarHorario(item.horarioEmbarque)
  ]);
}

function gerarPdfOperacional({ resultados = [], titulo, subtitulo, arquivo }) {
  if (!resultados.length) {
    return;
  }

  const resumo = obterResumoExportacao(resultados, {
    titulo,
    subtitulo,
    nomeArquivo: arquivo.replace(/\.pdf$/i, '')
  });

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(resumo.titulo, 14, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 106, 133);
  doc.text(resumo.subtitulo, 14, 22);

  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(200, 10, 78, 18, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Emitido em: ${resumo.emitidoEm}`, 204, 16);
  doc.text(`Data: ${resumo.dataReferencia}`, 204, 20.5);
  doc.text(`Solicitante: ${resumo.solicitante}`, 204, 25);
  doc.text(`Total: ${resumo.totalResultados} | OK: ${resumo.totalOk} | Erros: ${resumo.totalErros}`, 14, 27);

  autoTable(doc, {
    startY: 31,
    head: [['DATA', 'COLABORADOR', 'TURNO ENCAIXE', 'OBS', 'HORARIO']],
    body: montarLinhasPdf(resultados),
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 2.6,
      lineColor: [204, 214, 228],
      lineWidth: 0.2,
      textColor: [15, 23, 42]
    },
    headStyles: {
      fillColor: [198, 224, 180],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 28, halign: 'center' },
      1: { cellWidth: 98 },
      2: { cellWidth: 34, halign: 'center' },
      3: { cellWidth: 28, halign: 'center' },
      4: {
        cellWidth: 24,
        halign: 'center',
        textColor: [220, 38, 38],
        fontStyle: 'bold',
        fillColor: [255, 242, 102]
      }
    },
    margin: { left: 14, right: 14 }
  });

  doc.save(arquivo);
}

export function exportarResultadosPdf(resultados = [], contexto = {}) {
  gerarPdfOperacional({
    resultados,
    titulo: contexto.titulo || 'CROWN ENCAIXES PRO',
    subtitulo: contexto.subtitulo || 'Relatório operacional de encaixes',
    arquivo: nomeArquivoPadrao(contexto, 'pdf')
  });
}

export function exportarHistoricoExcel(lote) {
  if (!lote?.resultados?.length) {
    return;
  }
  exportarResultadosExcel(lote.resultados, {
    titulo: `Solicitação de ${lote.solicitante}`,
    subtitulo: `Histórico operacional • ${lote.createdAt ? new Date(lote.createdAt).toLocaleString('pt-BR') : ''}`,
    dataReferencia:
      lote.datasEncaixe?.length > 1
        ? 'Múltiplas datas'
        : formatarDataBR(lote.dataEncaixe || lote.dataPadrao || ''),
    solicitante: lote.solicitante,
    nomeArquivo: `historico-${formatarDataBR(lote.dataEncaixe || lote.dataPadrao || '').replaceAll('/', '-') || 'encaixe'}`
  });
}

export function exportarHistoricoPdf(lote) {
  if (!lote?.resultados?.length) {
    return;
  }

  const sufixoData =
    (lote.datasEncaixe?.length > 1 ? 'multiplas-datas' : formatarDataBR(lote.dataEncaixe || lote.dataPadrao || '').replaceAll('/', '-')) ||
    'encaixe';

  gerarPdfOperacional({
    resultados: lote.resultados,
    titulo: `Solicitacao de ${lote.solicitante}`,
    subtitulo: `${lote.datasEncaixe?.length > 1 ? 'Multiplas datas' : formatarDataBR(lote.dataEncaixe || lote.dataPadrao || '')} • ${lote.totalProcessados} processados`,
    arquivo: `historico-${sufixoData}.pdf`
  });
}
