const mysql = require('mysql2/promise');

async function testDatabase() {
  const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'fin_app_db'
  });

  try {
    console.log('🔍 Testing database connection...');
    
    // Test connection
    const [rows] = await db.query('SELECT 1 as test');
    console.log('✅ Database connection successful');
    
    // Check if users table exists
    const [tables] = await db.query('SHOW TABLES LIKE "users"');
    console.log('📋 Users table exists:', tables.length > 0);
    
    // Check all users
    const [users] = await db.query('SELECT id, first_name, last_name, status FROM users ORDER BY id');
    console.log('👥 All users in database:');
    users.forEach(user => {
      console.log(`   ID: ${user.id}, Name: ${user.first_name} ${user.last_name}, Status: ${user.status}`);
    });
    
    // Check specific user ID 2
    const [user2] = await db.query('SELECT * FROM users WHERE id = 2');
    console.log('🔍 User ID 2 exists:', user2.length > 0);
    if (user2.length > 0) {
      console.log('   User 2 details:', user2[0]);
    }
    
    // Test the approve query
    console.log('🧪 Testing approve query...');
    const [updateResult] = await db.query('UPDATE users SET status = ? WHERE id = ?', ['pending', 2]);
    console.log('✅ Update test successful, rows affected:', updateResult.affectedRows);
    
  } catch (error) {
    console.error('❌ Database test error:', error);
  } finally {
    await db.end();
  }
}

testDatabase(); 