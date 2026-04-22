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

export function exportarResultadosExcel(resultados = []) {
  const rows = resultados.map((item) => ({
    'Data do Encaixe': formatarDataBR(item.dataEncaixe),
    Colaborador: item.colaborador,
    'Turno Encaixe': item.turnoEncaixe,
    'Horário Embarque': formatarHorario(item.horarioEmbarque),
    'Ponto Embarque': item.pontoEmbarque,
    Rota: item.rota,
    Solicitante: item.solicitante
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Encaixes');
  XLSX.writeFile(workbook, 'crown-encaixes-pro.xlsx');
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

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(titulo, 14, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 106, 133);
  doc.text(subtitulo, 14, 22);

  autoTable(doc, {
    startY: 28,
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

export function exportarResultadosPdf(resultados = []) {
  gerarPdfOperacional({
    resultados,
    titulo: 'CROWN ENCAIXES PRO',
    subtitulo: 'Relatorio operacional de encaixes',
    arquivo: 'crown-encaixes-pro.pdf'
  });
}

export function exportarHistoricoExcel(lote) {
  if (!lote?.resultados?.length) {
    return;
  }

  const rows = lote.resultados.map((item) => ({
    'Criado em': lote.createdAt ? new Date(lote.createdAt).toLocaleString('pt-BR') : '',
    'Data do Encaixe': formatarDataBR(item.dataEncaixe),
    Colaborador: item.colaborador,
    'Turno Encaixe': item.turnoEncaixe,
    'Horário Embarque': formatarHorario(item.horarioEmbarque),
    'Ponto Embarque': item.pontoEmbarque,
    Rota: item.rota,
    Solicitante: item.solicitante,
    Status: item.status === 'ok' ? 'OK' : 'ERRO'
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Historico');

  const nomeArquivo = `historico-${formatarDataBR(lote.dataEncaixe || '').replaceAll('/', '-') || 'encaixe'}.xlsx`;
  XLSX.writeFile(workbook, nomeArquivo);
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
