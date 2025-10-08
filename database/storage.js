const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { MongoClient } = require('mongodb');
const config = require('../config.json');

let db, mongoClient, mongoDb;
let mongoCollection = {};

const jsonDir = path.join(__dirname, 'jsondata');
if (!fs.existsSync(jsonDir)) fs.mkdirSync(jsonDir);

const dataCache = {
  userMoney: [],
  userData: [],
  prefixesData: [],
  groupSettings: []
};

async function initStorage() {
  const storeType = (config.storeType || 'json').toLowerCase();

  try {
    if (storeType === 'sqlite') await initSQLite();
    else if (storeType === 'mongo') await initMongo();
    else await initJSON();
    console.log(`Storage initialized using ${storeType} backend.`);
  } catch (error) {
    console.error(`Error initializing storage with ${storeType} backend:`, error);
    process.exit(1);
  }
}

async function initSQLite() {
  const dbPath = path.join(__dirname, 'storage.sqlite');
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) throw err;
  });

  const tables = {
    userMoney: `CREATE TABLE IF NOT EXISTS userMoney (id TEXT PRIMARY KEY, money INTEGER, msgCount INTEGER)`,
    userData: `CREATE TABLE IF NOT EXISTS userData (id TEXT PRIMARY KEY, data TEXT)`,
    prefixesData: `CREATE TABLE IF NOT EXISTS prefixesData (id TEXT PRIMARY KEY, prefix TEXT)`,
    groupSettings: `CREATE TABLE IF NOT EXISTS groupSettings (id TEXT PRIMARY KEY, settings TEXT)`
  };

  for (const sql of Object.values(tables)) await runSQL(sql);

  dataCache.userMoney = await loadTable('userMoney');
  dataCache.userData = await loadTable('userData');
  dataCache.prefixesData = await loadTable('prefixesData');
  dataCache.groupSettings = await loadTable('groupSettings');
}

function runSQL(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function allSQL(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function loadTable(tableName) {
  try {
    const rows = await allSQL(`SELECT * FROM ${tableName}`);
    if (tableName === 'userData' || tableName === 'groupSettings') {
        return rows.map(r => ({ id: r.id, data: JSON.parse(r.data || r.settings) }));
    }
    return rows;
  } catch (err) {
    if (err.message.includes('no such table')) return [];
    throw err;
  }
}

async function saveTable(tableName, data) {
  let insertSQL, makeParams;
  if (tableName === 'userMoney') {
    insertSQL = `INSERT INTO userMoney (id, money, msgCount) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET money = excluded.money, msgCount = excluded.msgCount`;
    makeParams = (item) => [item.id, item.money ?? 0, item.msgCount ?? 0];
  } else if (tableName === 'userData') {
    insertSQL = `INSERT INTO userData (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data`;
    makeParams = (item) => [item.id, JSON.stringify(item.data)];
  } else if (tableName === 'prefixesData') {
    insertSQL = `INSERT INTO prefixesData (id, prefix) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET prefix = excluded.prefix`;
    makeParams = (item) => [item.id, item.prefix];
  } else if (tableName === 'groupSettings') {
    insertSQL = `INSERT INTO groupSettings (id, settings) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET settings = excluded.settings`;
    makeParams = (item) => [item.id, JSON.stringify(item.settings)];
  } else {
    return console.error(`Unknown table name: ${tableName}`);
  }

  for (const item of data) await runSQL(insertSQL, makeParams(item));
}

async function initMongo() {
  if (!config.mongoUri || !config.mongoDbName) {
    throw new Error("mongoUri and mongoDbName must be set in config.json for Mongo storage.");
  }
  mongoClient = new MongoClient(config.mongoUri);
  await mongoClient.connect();
  mongoDb = mongoClient.db(config.mongoDbName);

  const collections = ['userMoney', 'userData', 'prefixesData', 'groupSettings'];
  for (const key of collections) {
    mongoCollection[key] = mongoDb.collection(key);
    dataCache[key] = await mongoCollection[key].find().toArray();
  }
}

async function saveMongo(key) {
  if (!mongoCollection[key]) throw new Error(`No mongo collection for ${key}`);
  await mongoCollection[key].deleteMany({});
  if (dataCache[key].length === 0) return;
  await mongoCollection[key].insertMany(dataCache[key]);
}

async function initJSON() {
  for (const key of Object.keys(dataCache)) {
    const filePath = path.join(jsonDir, `${key}.json`);
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '[]');
    try { dataCache[key] = JSON.parse(fs.readFileSync(filePath, 'utf-8')); }
    catch { dataCache[key] = []; }
  }
}

function saveJSON(key) {
  const filePath = path.join(jsonDir, `${key}.json`);
  fs.writeFileSync(filePath, JSON.stringify(dataCache[key], null, 2));
}

async function getData(key) { return dataCache[key] || []; }

async function saveData(key) {
  const storeType = (config.storeType || 'json').toLowerCase();
  if (storeType === 'sqlite') await saveTable(key, dataCache[key]);
  else if (storeType === 'mongo') await saveMongo(key);
  else saveJSON(key);
}

async function countUserMessage(groupId, userJid, userMoney, saveData) {
  if (!groupId.endsWith('@g.us')) return;
  const id = `${groupId}_${userJid}`;
  let user = userMoney.find(u => u.id === id);
  if (!user) { user = { id, money: 0, msgCount: 1 }; userMoney.push(user); }
  else user.msgCount = (user.msgCount || 0) + 1;
  await saveData("userMoney");
}

module.exports = { initStorage, getData, saveData, dataCache, countUserMessage };
