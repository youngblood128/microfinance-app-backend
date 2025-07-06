const mysql = require('mysql2/promise');

async function checkDatabase() {
  const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'fin_app_db'
  });

  try {
    console.log('🔍 Checking database for users...');
    
    // Check all users
    const [users] = await db.query('SELECT id, first_name, last_name, phone_number, status FROM users ORDER BY id');
    console.log('👥 All users in database:');
    
    if (users.length === 0) {
      console.log('   No users found in database');
    } else {
      users.forEach(user => {
        console.log(`   ID: ${user.id}, Name: ${user.first_name} ${user.last_name}, Phone: ${user.phone_number}, Status: ${user.status}`);
      });
    }
    
    // Test phone number query
    const testPhone = '09123456789';
    const [phoneCheck] = await db.query('SELECT * FROM users WHERE phone_number = ?', [testPhone]);
    console.log(`\n📱 Checking for phone number: ${testPhone}`);
    console.log(`   Found: ${phoneCheck.length} users with this phone number`);
    
  } catch (error) {
    console.error('❌ Database check error:', error);
  } finally {
    await db.end();
  }
}

checkDatabase(); 