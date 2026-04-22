# GUIA DE INSTALACAO - CROWN ENCAIXES PRO

Este guia foi feito para qualquer pessoa da equipe conseguir instalar e executar o sistema no Windows.

## 1. O que precisa instalar

Antes de tudo, o computador precisa ter:

- Git
- Node.js

Links oficiais:

- Git: https://git-scm.com/download/win
- Node.js: https://nodejs.org/

Recomendado:

- Instalar a versao LTS do Node.js

## 2. Baixar o projeto do GitHub

Abra o PowerShell e execute:

```powershell
git clone https://github.com/willpg606/EncaixeCrown-Joka.git
cd EncaixeCrown-Joka
```

## 3. Instalar as dependencias

Ainda no PowerShell, execute:

```powershell
npm install
```

Esse comando baixa tudo o que o sistema precisa para funcionar.

## 4. Rodar a versao web

Execute:

```powershell
npm run dev
```

Depois abra no navegador:

- http://localhost:5173

## 5. Rodar a versao desktop

Se quiser abrir como aplicativo desktop:

```powershell
npm run desktop
```

## 6. Gerar o executavel .exe

Se quiser gerar a versao instalavel/portatil do sistema:

```powershell
npm run dist:win
```

O arquivo sera criado na pasta:

```text
release/
```

Normalmente com o nome:

```text
CROWN ENCAIXES PRO 1.0.0.exe
```

## 7. Como usar o sistema

Fluxo basico:

1. Abrir a tela `Importar Base`
2. Enviar a planilha `.xlsx`
3. Ir para `Novo Encaixe`
4. Informar o solicitante
5. Colar os nomes em lote
6. Processar os encaixes
7. Exportar em Excel ou PDF

## 8. Formatos aceitos na entrada

Exemplos:

```text
Joao Silva - A
Maria Souza - B
22/04/2026 | Carlos Lima - C
23/04/2026 | Ana Paula - ADM
```

## 9. Abas principais do sistema

- Dashboard
- Novo Encaixe
- Busca
- Historico
- Importar Base

## 10. Se der erro

Feche o terminal e rode novamente:

```powershell
npm install
npm run dev
```

Se a porta estiver ocupada ou a tela nao abrir, tente reiniciar o computador e repetir.

## 11. Resumo rapido de comandos

```powershell
git clone https://github.com/willpg606/EncaixeCrown-Joka.git
cd EncaixeCrown-Joka
npm install
npm run dev
```

## 12. Comandos mais usados

- Rodar web: `npm run dev`
- Rodar desktop: `npm run desktop`
- Gerar exe: `npm run dist:win`

