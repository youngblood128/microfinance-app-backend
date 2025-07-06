const mysql = require('mysql2/promise');

async function testPhoneValidation() {
  const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'fin_app_db'
  });

  try {
    console.log('🧪 Testing phone validation with existing phone number...');
    
    // Use an existing phone number from the database
    const existingPhone = '09795679098';
    
    // Test the validation query directly
    const [rows] = await db.query(
      "SELECT id, first_name, last_name, status FROM users WHERE phone_number = ?",
      [existingPhone]
    );

    console.log(`📱 Testing phone: ${existingPhone}`);
    console.log(`🔍 Query result: ${rows.length} users found`);
    
    if (rows.length > 0) {
      const user = rows[0];
      console.log(`✅ Found user: ${user.first_name} ${user.last_name} (ID: ${user.id}, Status: ${user.status})`);
      
      // Simulate the validation response
      const validationResponse = {
        exists: true,
        message: `Phone number ${existingPhone} is already registered. Please login instead.`,
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          status: user.status
        }
      };
      
      console.log('📤 Validation response:', validationResponse);
    } else {
      console.log('❌ No user found with this phone number');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await db.end();
  }
}

testPhoneValidation(); 