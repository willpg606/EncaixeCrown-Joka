# CROWN ENCAIXES PRO

Sistema web profissional para encaixe rápido de colaboradores em rotas, com importação de base Excel, processamento em lote, histórico e exportação.

## Stack

- React
- TailwindCSS
- Node.js + Express
- `xlsx`
- `uuid`

## Como rodar

1. Instale as dependências:

```bash
npm install
```

2. Inicie frontend e backend juntos:

```bash
npm run dev
```

3. Acesse:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3333`

## Versão desktop (.exe)

1. Gere o build desktop:

```bash
npm run dist:win
```

2. O executável será criado em:

```bash
release/
```

3. Para testar a versão desktop sem empacotar:

```bash
npm run desktop
```

## Fluxo de uso

1. Vá em `Importar Base` e envie a planilha `.xlsx`.
2. Na tela `Novo Encaixe`, preencha solicitante e data.
3. Cole os colaboradores em lote no formato `Nome - Turno`.
4. Clique em `Processar Encaixes`.
5. Exporte em Excel ou copie o resultado formatado.

## Colunas esperadas na base Excel

- `ID`
- `ROTA`
- `HORÁRIO EMBARQUE`
- `PONTO DE EMBARQUE`
- `FUNCIONÁRIO`

## Observações

- A base e o histórico são persistidos em `backend/storage`.
- Turnos válidos: `A`, `B`, `C`, `D`, `ADM`.
- Linhas inválidas ou não encontradas retornam `NÃO ENCONTRADO`.
