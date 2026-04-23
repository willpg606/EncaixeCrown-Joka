const parseResponse = async (response) => {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Falha na requisição.');
  }

  return data;
};

export const getBaseStatus = async () => {
  const response = await fetch('/api/base/status');
  return parseResponse(response);
};

export const uploadBase = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/base/upload', {
    method: 'POST',
    body: formData
  });

  return parseResponse(response);
};

export const criarBackup = async () => {
  const response = await fetch('/api/backup/create', {
    method: 'POST'
  });

  return parseResponse(response);
};

export const restaurarBackup = async (fileName) => {
  const response = await fetch('/api/backup/restore', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fileName })
  });

  return parseResponse(response);
};

export const processarEncaixes = async (payload) => {
  const response = await fetch('/api/encaixes/process', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return parseResponse(response);
};

export const getHistory = async () => {
  const response = await fetch('/api/history');
  return parseResponse(response);
};

export const atualizarHistorico = async (id, payload) => {
  const response = await fetch(`/api/history/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return parseResponse(response);
};

export const excluirHistorico = async (id) => {
  const response = await fetch(`/api/history/${id}`, {
    method: 'DELETE'
  });

  return parseResponse(response);
};

export const buscarColaboradores = async (query) => {
  const response = await fetch(`/api/base/search?q=${encodeURIComponent(query)}`);
  return parseResponse(response);
};

export const buscarPorData = async (data, turno = '') => {
  const query = new URLSearchParams({ data });

  if (turno) {
    query.set('turno', turno);
  }

  const response = await fetch(`/api/busca?${query.toString()}`);
  return parseResponse(response);
};

export const getInconsistencias = async () => {
  const response = await fetch('/api/inconsistencias');
  return parseResponse(response);
};

export const getSolicitantes = async () => {
  const response = await fetch('/api/solicitantes');
  return parseResponse(response);
};

export const criarSolicitante = async (nome) => {
  const response = await fetch('/api/solicitantes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ nome })
  });

  return parseResponse(response);
};

export const atualizarSolicitante = async (nomeAtual, nome) => {
  const response = await fetch(`/api/solicitantes/${encodeURIComponent(nomeAtual)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ nome })
  });

  return parseResponse(response);
};

export const excluirSolicitante = async (nome) => {
  const response = await fetch(`/api/solicitantes/${encodeURIComponent(nome)}`, {
    method: 'DELETE'
  });

  return parseResponse(response);
};

export const getOutlookConfig = async () => {
  const response = await fetch('/api/outlook/config');
  return parseResponse(response);
};

export const salvarOutlookConfig = async (payload) => {
  const response = await fetch('/api/outlook/config', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return parseResponse(response);
};

export const validarOutlookConfig = async () => {
  const response = await fetch('/api/outlook/validate', {
    method: 'POST'
  });

  return parseResponse(response);
};
