const mysql = require('mysql2/promise');

async function addFlaggedColumn() {
  const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'fin_app_db'
  });

  try {
    console.log('🔍 Adding flagged_for_review column to OTPs table...');
    
    // Add the column if it doesn't exist
    await db.query(`
      ALTER TABLE otps 
      ADD COLUMN flagged_for_review BOOLEAN DEFAULT FALSE
    `);
    
    console.log('✅ Column added successfully');
    
    // Check table structure
    const [columns] = await db.query("DESCRIBE otps");
    console.log('📋 OTP table columns:', columns);
    
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await db.end();
  }
}

addFlaggedColumn(); 