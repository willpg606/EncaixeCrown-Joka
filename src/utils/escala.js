function criarDataLocal(valor) {
  const [ano, mes, dia] = String(valor || '')
    .split('-')
    .map((item) => Number(item));

  if (!ano || !mes || !dia) {
    return null;
  }

  return new Date(ano, mes - 1, dia);
}

function diferencaEmDias(dataA, dataB) {
  const inicioA = new Date(dataA.getFullYear(), dataA.getMonth(), dataA.getDate()).getTime();
  const inicioB = new Date(dataB.getFullYear(), dataB.getMonth(), dataB.getDate()).getTime();

  return Math.floor((inicioA - inicioB) / (1000 * 60 * 60 * 24));
}

export function obterTurnosPorData(dataIso = '') {
  const data = criarDataLocal(dataIso);

  if (!data) {
    return ['A', 'B', 'C', 'D', 'ADM'];
  }

  const ancora = new Date(2026, 3, 22);
  const diasDesdeAncora = diferencaEmDias(data, ancora);
  const bloco = Math.floor(Math.abs(diasDesdeAncora) / 3);
  const grupoBase = bloco % 2 === 0 ? ['C', 'D'] : ['A', 'B'];
  const ehAntesDaAncora = diasDesdeAncora < 0;
  const grupoTurnos = ehAntesDaAncora
    ? bloco % 2 === 0
      ? ['A', 'B']
      : ['C', 'D']
    : grupoBase;
  const diaSemana = data.getDay();
  const incluiAdm = diaSemana >= 1 && diaSemana <= 5;

  return incluiAdm ? [...grupoTurnos, 'ADM'] : grupoTurnos;
}

export function descreverEscalaPorData(dataIso = '') {
  const turnos = obterTurnosPorData(dataIso);

  if (!dataIso) {
    return 'Selecione uma data para liberar os turnos corretos.';
  }

  return `Turnos liberados para a data escolhida: ${turnos.join(', ')}.`;
}
