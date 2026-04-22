export function normalizarNome(nome = '') {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

export function gerarChave(nome = '', turno = '') {
  return `${normalizarNome(nome)}${String(turno).trim().toUpperCase()}`;
}
