const mysql = require('mysql2/promise');

async function checkAdminNotifications() {
  const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'fin_app_db'
  });

  try {
    console.log('🔍 Checking admin notifications...');
    
    // Check all notifications
    const [notifications] = await db.query(`
      SELECT * FROM admin_notifications 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log('📋 All notifications:', notifications);
    
    // Check specifically for potential duplicate notifications
    const [potentialDuplicates] = await db.query(`
      SELECT * FROM admin_notifications 
      WHERE type = 'potential_duplicate' 
      ORDER BY created_at DESC
    `);
    
    console.log('⚠️ Potential duplicate notifications:', potentialDuplicates);
    
    // Check recent OTPs
    const [recentOtps] = await db.query(`
      SELECT * FROM otps 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('📲 Recent OTPs:', recentOtps);
    
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await db.end();
  }
}

checkAdminNotifications(); 