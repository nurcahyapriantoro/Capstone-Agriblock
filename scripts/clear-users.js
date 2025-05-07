#!/usr/bin/env node

/**
 * Script untuk menghapus semua data user dari database
 * 
 * Penggunaan: node scripts/clear-users.js
 */

const { Level } = require('level');
const path = require('path');
const readline = require('readline');

// Dapatkan path database dari lingkungan atau gunakan path default
const env = process.env.APP_ENV || '';
const dbPath = path.join(__dirname, '..', 'log', env, 'txhashStore');

// Buat interface readline untuk konfirmasi
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Fungsi utama
async function clearUsers() {
  console.log('\n🚨 WARNING: This will delete ALL user data from the database 🚨');
  console.log('Database path:', dbPath);
  
  // Konfirmasi dari user
  rl.question('\nAre you sure you want to proceed? This action CANNOT be undone. (yes/no): ', async (answer) => {
    if (answer.toLowerCase() !== 'yes') {
      console.log('Operation cancelled.');
      rl.close();
      return;
    }
    
    console.log('\nDeleting all user data...');
    
    try {
      // Buka database
      const db = new Level(dbPath);
      
      // Ambil semua key
      const allKeys = await db.keys().all();
      console.log(`Found ${allKeys.length} total keys in database.`);
      
      // Filter key-key yang terkait dengan user
      const userKeys = allKeys.filter(key => {
        const keyStr = key.toString();
        return keyStr.startsWith('user:') || 
               keyStr.startsWith('user-email:') || 
               keyStr.startsWith('user-google:');
      });
      
      console.log(`Found ${userKeys.length} user-related keys to delete.`);
      
      // Hapus semua data user
      let deletedCount = 0;
      for (const key of userKeys) {
        await db.del(key);
        deletedCount++;
        
        // Tampilkan progress setiap 10 item
        if (deletedCount % 10 === 0 || deletedCount === userKeys.length) {
          console.log(`Deleted ${deletedCount}/${userKeys.length} user records...`);
        }
      }
      
      console.log('\n✅ All user data has been successfully deleted!');
      console.log('You can now restart the server with a clean user database.');
      
    } catch (error) {
      console.error('❌ Error deleting user data:', error);
    } finally {
      rl.close();
    }
  });
}

// Jalankan fungsi utama
clearUsers();