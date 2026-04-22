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

export const buscarPorData = async (data) => {
  const response = await fetch(`/api/busca?data=${encodeURIComponent(data)}`);
  return parseResponse(response);
};
