export function formatarDataBR(valor) {
  if (!valor) {
    return '';
  }

  const texto = String(valor).trim();
  const isoMatch = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoMatch) {
    const [, ano, mes, dia] = isoMatch;
    return `${dia}/${mes}/${ano}`;
  }

  return texto;
}

export function formatarHorario(valor) {
  if (!valor) {
    return '';
  }

  const texto = String(valor).trim();
  const horaMatch = texto.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);

  if (horaMatch) {
    const [, horas, minutos] = horaMatch;
    return `${horas.padStart(2, '0')}:${minutos}`;
  }

  const numero = Number(texto.replace(',', '.'));

  if (!Number.isNaN(numero) && texto.includes('.')) {
    const totalMinutos = Math.round(numero * 24 * 60);
    const horas = String(Math.floor(totalMinutos / 60) % 24).padStart(2, '0');
    const minutos = String(totalMinutos % 60).padStart(2, '0');
    return `${horas}:${minutos}`;
  }

  return texto;
}
