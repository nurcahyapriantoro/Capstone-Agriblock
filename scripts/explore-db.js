/**
 * Database Explorer Script untuk Level DB Blockchain
 * 
 * Script ini memungkinkan Anda melihat isi dari LevelDB database blockchain
 * Gunakan: node scripts/explore-db.js [database] [command] [key/prefix]
 * 
 * Database: state, block, bhash, txhash, stake
 * Command: get, list, count, search
 * 
 * Contoh:
 * - Melihat semua key: node scripts/explore-db.js state list
 * - Melihat data tertentu: node scripts/explore-db.js txhash get user:FARM-12345
 * - Melihat jumlah entry: node scripts/explore-db.js block count
 * - Mencari dengan prefix: node scripts/explore-db.js txhash search user:
 */

const { Level } = require('level');
const path = require('path');
const fs = require('fs');

// Path to database
const basePath = path.join(__dirname, '../log');

// Database mapping
const databases = {
  state: path.join(basePath, 'stateStore'),
  block: path.join(basePath, 'blockStore'),
  bhash: path.join(basePath, 'bhashStore'),
  txhash: path.join(basePath, 'txhashStore'),
  stake: path.join(basePath, 'stakeStore')
};

// Parse command line arguments
const args = process.argv.slice(2);
const dbName = args[0];
const command = args[1];
const keyOrPrefix = args[2];

// Check database argument
if (!dbName || !databases[dbName]) {
  console.error(`
Database harus dispesifikasikan. Pilihan yang tersedia:
- state  : State blockchain (akun, saldo)
- block  : Informasi blok
- bhash  : Hash blok
- txhash : Data transaksi
- stake  : Informasi staking
  `);
  process.exit(1);
}

// Check if database exists
if (!fs.existsSync(databases[dbName])) {
  console.error(`Database '${dbName}' tidak ditemukan di ${databases[dbName]}`);
  process.exit(1);
}

// Check command argument
if (!command || !['get', 'list', 'count', 'search'].includes(command)) {
  console.error(`
Command harus dispesifikasikan. Pilihan yang tersedia:
- get [key]        : Menampilkan data untuk key tertentu
- list [limit]     : Menampilkan semua key (opsional: batas jumlah yang ditampilkan)
- count            : Menghitung jumlah entri dalam database
- search [prefix]  : Mencari key dengan awalan tertentu
  `);
  process.exit(1);
}

// Create database instance
const db = new Level(databases[dbName], { valueEncoding: 'json' });

// Execute command
async function executeCommand() {
  try {
    switch (command) {
      case 'get':
        if (!keyOrPrefix) {
          console.error('Key harus disediakan untuk command "get"');
          process.exit(1);
        }
        await getKey(keyOrPrefix);
        break;
      
      case 'list':
        const limit = keyOrPrefix ? parseInt(keyOrPrefix) : undefined;
        await listKeys(limit);
        break;
      
      case 'count':
        await countEntries();
        break;
      
      case 'search':
        if (!keyOrPrefix) {
          console.error('Prefix harus disediakan untuk command "search"');
          process.exit(1);
        }
        await searchByPrefix(keyOrPrefix);
        break;
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
  } finally {
    await db.close();
  }
}

// Get a specific key
async function getKey(key) {
  try {
    const value = await db.get(key);
    console.log(`\nData untuk key "${key}":`);
    console.log('-------------------' + '-'.repeat(key.length));
    
    // Format output based on value type
    if (typeof value === 'object') {
      console.log(JSON.stringify(value, null, 2));
    } else {
      try {
        // Try to parse string as JSON
        const parsedValue = JSON.parse(value);
        console.log(JSON.stringify(parsedValue, null, 2));
      } catch (e) {
        // If not valid JSON, show as is
        console.log(value);
      }
    }
  } catch (error) {
    if (error.code === 'LEVEL_NOT_FOUND') {
      console.error(`Key "${key}" tidak ditemukan dalam database.`);
    } else {
      throw error;
    }
  }
}

// List all keys
async function listKeys(limit) {
  console.log(`\nDaftar key dalam database "${dbName}":`);
  console.log('----------------------------------------');
  
  let count = 0;
  try {
    for await (const key of db.keys()) {
      console.log(key.toString());
      count++;
      
      if (limit && count >= limit) {
        console.log(`\n...terbatas pada ${limit} entri. Gunakan command "count" untuk melihat total entri.`);
        break;
      }
    }
    
    if (count === 0) {
      console.log('Database kosong.');
    } else if (!limit) {
      console.log(`\nTotal: ${count} entri`);
    }
  } catch (error) {
    throw error;
  }
}

// Count entries in database
async function countEntries() {
  let count = 0;
  try {
    for await (const _ of db.keys()) {
      count++;
    }
    console.log(`\nJumlah entri dalam database "${dbName}": ${count}`);
  } catch (error) {
    throw error;
  }
}

// Search keys by prefix
async function searchByPrefix(prefix) {
  console.log(`\nMencari key dengan awalan "${prefix}" dalam database "${dbName}":`);
  console.log('----------------------------------------' + '-'.repeat(prefix.length));
  
  let count = 0;
  try {
    for await (const key of db.keys({ gte: prefix, lte: prefix + '\uFFFF' })) {
      const keyStr = key.toString();
      console.log(keyStr);
      count++;
    }
    
    if (count === 0) {
      console.log(`Tidak ada key dengan awalan "${prefix}".`);
    } else {
      console.log(`\nTotal: ${count} key ditemukan dengan awalan "${prefix}"`);
    }
  } catch (error) {
    throw error;
  }
}

// Print data in a structured format
function prettyPrint(data) {
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log(data);
    }
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

// Run command
executeCommand().catch(error => {
  console.error(`Error saat mengakses database: ${error.message}`);
  process.exit(1);
});