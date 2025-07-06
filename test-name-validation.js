const mysql = require('mysql2/promise');

async function testNameValidation() {
  const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'fin_app_db'
  });

  try {
    console.log('🔍 Testing name validation...');
    
    // First, let's see all users with similar names
    const [allUsers] = await db.query(
      "SELECT id, first_name, last_name, middle_name, phone_number, status FROM users WHERE first_name LIKE '%Lazny%' OR last_name LIKE '%Dongallo%'"
    );
    
    console.log('🔍 All users with similar names:', allUsers);
    
    const first_name = 'Lazny Mayze';
    const last_name = 'Dongallo';
    const middle_name = null;
    
    console.log('📋 Testing with:', { first_name, last_name, middle_name });
    
    // Test exact match
    const [exactMatch] = await db.query(
      "SELECT id, first_name, last_name, middle_name, phone_number, status FROM users WHERE first_name = ? AND last_name = ?",
      [first_name, last_name]
    );
    
    console.log('🔍 Exact match result:', exactMatch);
    
    // Test the exact query from the server
    const [existingName] = await db.query(
      "SELECT id, first_name, last_name, middle_name, phone_number, status FROM users WHERE first_name = ? AND last_name = ? AND (middle_name = ? OR (middle_name IS NULL AND ? IS NULL))",
      [first_name, last_name, middle_name || null, middle_name || null]
    );
    
    console.log('🔍 Name validation query result:', existingName);
    console.log('🔍 Number of matching users:', existingName.length);
    
    if (existingName.length > 0) {
      console.log('✅ Name validation should trigger!');
      existingName.forEach((user, index) => {
        console.log(`   User ${index + 1}: ${user.first_name} ${user.last_name} (Phone: ${user.phone_number}, Status: ${user.status})`);
      });
    } else {
      console.log('❌ No matching users found - validation should NOT trigger');
    }
    
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await db.end();
  }
}

testNameValidation(); 