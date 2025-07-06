const mysql = require('mysql2/promise');

async function fixDatabase() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'fin_app_db'
  });

  try {
    console.log('🔧 Fixing database structure...');

    // Update address column to TEXT to handle longer addresses
    await connection.execute(`
      ALTER TABLE users MODIFY COLUMN address TEXT NOT NULL
    `);
    console.log('✅ Address column updated to TEXT');

    // Update otp_code column to VARCHAR(6) to match the OTP generation
    await connection.execute(`
      ALTER TABLE otps MODIFY COLUMN otp_code VARCHAR(6) NOT NULL
    `);
    console.log('✅ OTP code column updated to VARCHAR(6)');

    console.log('🎉 Database structure fixed successfully!');
  } catch (error) {
    console.error('❌ Database fix failed:', error);
  } finally {
    await connection.end();
  }
}

fixDatabase(); 