export function buscarNaBase(base = [], chave = '') {
  return base.find((item) => item.id === chave) || null;
}
