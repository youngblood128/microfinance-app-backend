const mysql = require('mysql2/promise');

async function checkOTPTable() {
  const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'fin_app_db'
  });

  try {
    console.log('🔍 Checking OTP table...');
    
    // Check all OTP records
    const [otps] = await db.query("SELECT * FROM otps ORDER BY created_at DESC");
    console.log('📋 OTP records:', otps);
    
    // Check table structure
    const [columns] = await db.query("DESCRIBE otps");
    console.log('📋 OTP table columns:', columns);
    
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await db.end();
  }
}

checkOTPTable(); 