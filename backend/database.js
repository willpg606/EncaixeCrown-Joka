import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

const readJsonFile = (filePath, fallback) => {
  try {
    if (!fs.existsSync(filePath)) {
      return fallback;
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const parseJson = (value, fallback) => {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export function createDatabase({
  storageDir,
  baseCachePath,
  historyPath,
  settingsPath,
  validacaoBaseVazia,
  defaultSettings
}) {
  fs.mkdirSync(storageDir, { recursive: true });

  const dbPath = path.join(storageDir, 'crown-encaixes-pro.db');
  const backupDir = path.join(storageDir, 'backups');
  fs.mkdirSync(backupDir, { recursive: true });

  const createTransaction = (work) => (payload) => {
    db.exec('BEGIN IMMEDIATE');

    try {
      const result = work(payload);
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  };

  const initializeDb = (database) => {
    database.exec(`
      PRAGMA journal_mode = DELETE;
      PRAGMA foreign_keys = ON;
    `);

    database.exec(`
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS base_rows (
        id TEXT PRIMARY KEY,
        rota TEXT,
        horarioEmbarque TEXT,
        pontoEmbarque TEXT,
        funcionario TEXT,
        nomeBusca TEXT,
        nomeExibicao TEXT,
        turno TEXT,
        nomeOriginal TEXT
      );

      CREATE TABLE IF NOT EXISTS history_lots (
        id TEXT PRIMARY KEY,
        createdAt TEXT NOT NULL,
        solicitante TEXT NOT NULL,
        dataEncaixe TEXT,
        datasEncaixe TEXT,
        dataPadrao TEXT,
        rawInput TEXT,
        totalProcessados INTEGER NOT NULL,
        totalErros INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS history_results (
        id TEXT PRIMARY KEY,
        loteId TEXT NOT NULL,
        status TEXT NOT NULL,
        dataEncaixe TEXT,
        colaborador TEXT NOT NULL,
        turnoEncaixe TEXT,
        horarioEmbarque TEXT,
        pontoEmbarque TEXT,
        rota TEXT,
        solicitante TEXT,
        FOREIGN KEY (loteId) REFERENCES history_lots(id) ON DELETE CASCADE
      );
    `);
  };

  let db = new DatabaseSync(dbPath);
  initializeDb(db);

  const getMetadata = (key, fallback = null) => {
    const row = db.prepare('SELECT value FROM metadata WHERE key = ?').get(key);
    return row ? row.value : fallback;
  };

  const setMetadata = (key, value) => {
    db.prepare(`
      INSERT INTO metadata (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, value);
  };

  const loadBase = () => ({
    rows: db.prepare('SELECT * FROM base_rows ORDER BY nomeExibicao, funcionario, id').all(),
    importedAt: getMetadata('base.importedAt', null),
    fileName: getMetadata('base.fileName', ''),
    validation: parseJson(getMetadata('base.validation', ''), validacaoBaseVazia)
  });

  const saveBaseTransaction = createTransaction((base) => {
    db.prepare('DELETE FROM base_rows').run();

    const insertRow = db.prepare(`
      INSERT INTO base_rows (
        id, rota, horarioEmbarque, pontoEmbarque, funcionario, nomeBusca, nomeExibicao, turno, nomeOriginal
      ) VALUES (
        @id, @rota, @horarioEmbarque, @pontoEmbarque, @funcionario, @nomeBusca, @nomeExibicao, @turno, @nomeOriginal
      )
    `);

    for (const row of base.rows || []) {
      insertRow.run({
        id: row.id,
        rota: row.rota || '',
        horarioEmbarque: row.horarioEmbarque || '',
        pontoEmbarque: row.pontoEmbarque || '',
        funcionario: row.funcionario || '',
        nomeBusca: row.nomeBusca || '',
        nomeExibicao: row.nomeExibicao || '',
        turno: row.turno || '',
        nomeOriginal: row.nomeOriginal || ''
      });
    }

    setMetadata('base.importedAt', base.importedAt || '');
    setMetadata('base.fileName', base.fileName || '');
    setMetadata('base.validation', JSON.stringify(base.validation || validacaoBaseVazia));
  });

  const saveBase = (base) => saveBaseTransaction(base);

  const loadHistory = () => {
    const lots = db
      .prepare('SELECT * FROM history_lots ORDER BY datetime(createdAt) DESC, rowid DESC')
      .all();
    const results = db.prepare('SELECT * FROM history_results').all();
    const resultsByLot = new Map();

    for (const result of results) {
      const list = resultsByLot.get(result.loteId) || [];
      list.push({
        id: result.id,
        status: result.status,
        dataEncaixe: result.dataEncaixe || '',
        colaborador: result.colaborador,
        turnoEncaixe: result.turnoEncaixe || '',
        horarioEmbarque: result.horarioEmbarque || '',
        pontoEmbarque: result.pontoEmbarque || '',
        rota: result.rota || '',
        solicitante: result.solicitante || ''
      });
      resultsByLot.set(result.loteId, list);
    }

    return lots.map((lot) => ({
      id: lot.id,
      createdAt: lot.createdAt,
      solicitante: lot.solicitante,
      dataEncaixe: lot.dataEncaixe || '',
      datasEncaixe: parseJson(lot.datasEncaixe, []),
      dataPadrao: lot.dataPadrao || '',
      rawInput: lot.rawInput || '',
      totalProcessados: lot.totalProcessados,
      totalErros: lot.totalErros,
      resultados: resultsByLot.get(lot.id) || []
    }));
  };

  const saveHistoryTransaction = createTransaction((history) => {
    db.prepare('DELETE FROM history_results').run();
    db.prepare('DELETE FROM history_lots').run();

    const insertLot = db.prepare(`
      INSERT INTO history_lots (
        id, createdAt, solicitante, dataEncaixe, datasEncaixe, dataPadrao, rawInput, totalProcessados, totalErros
      ) VALUES (
        @id, @createdAt, @solicitante, @dataEncaixe, @datasEncaixe, @dataPadrao, @rawInput, @totalProcessados, @totalErros
      )
    `);

    const insertResult = db.prepare(`
      INSERT INTO history_results (
        id, loteId, status, dataEncaixe, colaborador, turnoEncaixe, horarioEmbarque, pontoEmbarque, rota, solicitante
      ) VALUES (
        @id, @loteId, @status, @dataEncaixe, @colaborador, @turnoEncaixe, @horarioEmbarque, @pontoEmbarque, @rota, @solicitante
      )
    `);

    for (const lot of history || []) {
      insertLot.run({
        id: lot.id,
        createdAt: lot.createdAt,
        solicitante: lot.solicitante,
        dataEncaixe: lot.dataEncaixe || '',
        datasEncaixe: JSON.stringify(lot.datasEncaixe || []),
        dataPadrao: lot.dataPadrao || '',
        rawInput: lot.rawInput || '',
        totalProcessados: lot.totalProcessados || 0,
        totalErros: lot.totalErros || 0
      });

      for (const result of lot.resultados || []) {
        insertResult.run({
          id: result.id,
          loteId: lot.id,
          status: result.status,
          dataEncaixe: result.dataEncaixe || '',
          colaborador: result.colaborador,
          turnoEncaixe: result.turnoEncaixe || '',
          horarioEmbarque: result.horarioEmbarque || '',
          pontoEmbarque: result.pontoEmbarque || '',
          rota: result.rota || '',
          solicitante: result.solicitante || ''
        });
      }
    }
  });

  const saveHistory = (history) => saveHistoryTransaction(history);

  const loadSettings = () => {
    const raw = getMetadata('settings', '');
    return {
      ...defaultSettings,
      ...parseJson(raw, {}),
      outlook: {
        ...defaultSettings.outlook,
        ...parseJson(raw, {}).outlook
      }
    };
  };

  const saveSettings = (settings) => {
    setMetadata('settings', JSON.stringify(settings));
  };

  const reopenDb = () => {
    db.close();
    db = new DatabaseSync(dbPath);
    initializeDb(db);
  };

  const migrateJsonIfNeeded = () => {
    const migrationDone = getMetadata('migration.json_to_sqlite.done', '');

    if (migrationDone) {
      return;
    }

    const baseCount = db.prepare('SELECT COUNT(*) as total FROM base_rows').get().total;
    const lotCount = db.prepare('SELECT COUNT(*) as total FROM history_lots').get().total;
    const settingsExists = Boolean(getMetadata('settings', ''));

    if (baseCount === 0 && fs.existsSync(baseCachePath)) {
      const legacyBase = readJsonFile(baseCachePath, {
        rows: [],
        importedAt: null,
        fileName: '',
        validation: validacaoBaseVazia
      });
      saveBase(legacyBase);
    }

    if (lotCount === 0 && fs.existsSync(historyPath)) {
      const legacyHistory = readJsonFile(historyPath, []);
      saveHistory(legacyHistory);
    }

    if (!settingsExists && fs.existsSync(settingsPath)) {
      const legacySettings = readJsonFile(settingsPath, defaultSettings);
      saveSettings({
        ...defaultSettings,
        ...legacySettings,
        outlook: {
          ...defaultSettings.outlook,
          ...(legacySettings.outlook || {})
        }
      });
    } else if (!settingsExists) {
      saveSettings(defaultSettings);
    }

    setMetadata('migration.json_to_sqlite.done', new Date().toISOString());
  };

  migrateJsonIfNeeded();

  const formatBackupStamp = () => {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  };

  const createBackup = () => {
    const fileName = `crown-encaixes-pro-backup_${formatBackupStamp()}.db`;
    const destination = path.join(backupDir, fileName);

    db.exec('PRAGMA optimize');
    fs.copyFileSync(dbPath, destination);

    return {
      fileName,
      path: destination,
      createdAt: new Date().toISOString(),
      size: fs.statSync(destination).size
    };
  };

  const listBackups = () =>
    fs
      .readdirSync(backupDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.db'))
      .map((entry) => {
        const fullPath = path.join(backupDir, entry.name);
        const stats = fs.statSync(fullPath);

        return {
          fileName: entry.name,
          path: fullPath,
          createdAt: stats.mtime.toISOString(),
          size: stats.size
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const restoreBackup = (fileName) => {
    const safeName = path.basename(String(fileName || '').trim());
    const source = path.join(backupDir, safeName);

    if (!safeName || !fs.existsSync(source)) {
      throw new Error('Backup selecionado não foi encontrado.');
    }

    db.close();
    fs.copyFileSync(source, dbPath);
    db = new DatabaseSync(dbPath);
    initializeDb(db);

    return {
      fileName: safeName,
      path: source,
      restoredAt: new Date().toISOString()
    };
  };

  return {
    dbPath,
    backupDir,
    loadBase,
    saveBase,
    loadHistory,
    saveHistory,
    loadSettings,
    saveSettings,
    createBackup,
    listBackups,
    restoreBackup
  };
}
