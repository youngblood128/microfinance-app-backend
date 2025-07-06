const mysql = require('mysql2/promise');

async function debugPhoneNumbers() {
  const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'fin_app_db'
  });

  try {
    console.log('🔍 Debugging phone numbers in database...');
    
    // Get all users with their phone numbers
    const [users] = await db.query('SELECT id, first_name, last_name, phone_number, LENGTH(phone_number) as phone_length FROM users ORDER BY id');
    
    console.log('📱 All phone numbers in database:');
    users.forEach(user => {
      console.log(`   ID: ${user.id}, Name: ${user.first_name} ${user.last_name}`);
      console.log(`   Phone: "${user.phone_number}" (length: ${user.phone_length}, type: ${typeof user.phone_number})`);
      console.log(`   Phone bytes: ${Buffer.from(user.phone_number).toString('hex')}`);
      console.log('');
    });
    
    // Test with the phone number from our test
    const testPhone = '09795679098';
    console.log(`🧪 Testing with phone: "${testPhone}" (length: ${testPhone.length})`);
    
    const [result] = await db.query('SELECT * FROM users WHERE phone_number = ?', [testPhone]);
    console.log(`🔍 Direct query result: ${result.length} matches`);
    
    if (result.length > 0) {
      console.log('✅ Found match:', result[0]);
    } else {
      console.log('❌ No match found');
      
      // Try with different formats
      console.log('🔄 Trying different formats...');
      
      // Try without leading zero
      const withoutZero = testPhone.replace(/^0+/, '');
      const [result2] = await db.query('SELECT * FROM users WHERE phone_number = ?', [withoutZero]);
      console.log(`Without leading zero (${withoutZero}): ${result2.length} matches`);
      
      // Try with +63 prefix
      const withPlus = '+63' + testPhone.substring(1);
      const [result3] = await db.query('SELECT * FROM users WHERE phone_number = ?', [withPlus]);
      console.log(`With +63 prefix (${withPlus}): ${result3.length} matches`);
      
      // Try with 63 prefix
      const with63 = '63' + testPhone.substring(1);
      const [result4] = await db.query('SELECT * FROM users WHERE phone_number = ?', [with63]);
      console.log(`With 63 prefix (${with63}): ${result4.length} matches`);
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await db.end();
  }
}

debugPhoneNumbers(); 