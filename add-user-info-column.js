const mysql = require('mysql2/promise');

async function addUserInfoColumn() {
  const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'fin_app_db'
  });

  try {
    console.log('🔍 Adding user_info column to OTPs table...');
    
    // Add the column if it doesn't exist
    await db.query(`
      ALTER TABLE otps 
      ADD COLUMN user_info TEXT
    `);
    
    console.log('✅ user_info column added successfully');
    
    // Check table structure
    const [columns] = await db.query("DESCRIBE otps");
    console.log('📋 OTP table columns:', columns);
    
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️ user_info column already exists');
    } else {
      console.error('❌ Error:', err);
    }
  } finally {
    await db.end();
  }
}

addUserInfoColumn(); 