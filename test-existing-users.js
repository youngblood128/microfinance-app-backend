const mysql = require('mysql2/promise');

async function testExistingUsers() {
  const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'fin_app_db'
  });

  try {
    console.log('🔍 Checking existing users...');
    
    // Check all users
    const [users] = await db.query("SELECT id, first_name, last_name, phone_number, status FROM users");
    console.log('📋 All users:', users);
    
    // Check specific phone number
    const [phoneCheck] = await db.query("SELECT * FROM users WHERE phone_number = ?", ['1234567890']);
    console.log('📱 Users with phone 1234567890:', phoneCheck);
    
    // Check specific name
    const [nameCheck] = await db.query("SELECT * FROM users WHERE first_name = ? AND last_name = ?", ['Test', 'User']);
    console.log('👤 Users with name Test User:', nameCheck);
    
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await db.end();
  }
}

testExistingUsers(); 