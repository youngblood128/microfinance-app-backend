const mysql = require('mysql2/promise');

async function setupDatabase() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'fin_app_db'
  });

  try {
    // Drop existing tables in correct order (child tables first)
    await connection.execute('DROP TABLE IF EXISTS admin_notifications');
    await connection.execute('DROP TABLE IF EXISTS otps');
    await connection.execute('DROP TABLE IF EXISTS users');

    // Create OTPs table
    await connection.execute(`
      CREATE TABLE otps (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone_number VARCHAR(20) NOT NULL,
        otp_code VARCHAR(6) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Users table with all new fields
    await connection.execute(`
      CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        
        -- Name fields
        last_name VARCHAR(100) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        middle_name VARCHAR(100),
        
        -- Personal Information
        gender ENUM('Male', 'Female', 'Other') NOT NULL,
        civil_status ENUM('Single', 'Married', 'Widowed', 'Divorced', 'Separated') NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        
        -- Address fields
        country VARCHAR(100) NOT NULL,
        province VARCHAR(100) NOT NULL,
        city_municipality VARCHAR(100) NOT NULL,
        barangay VARCHAR(100) NOT NULL,
        subdivision_address1 VARCHAR(255) NOT NULL,
        street_address2 VARCHAR(255),
        zipcode VARCHAR(10) NOT NULL,
        
        -- Family Information
        mothers_maiden_name VARCHAR(200) NOT NULL,
        
        -- ID Information
        valid_id_type ENUM('Passport', 'Driver License', 'SSS ID', 'GSIS ID', 'PhilHealth ID', 'Voter ID', 'National ID', 'Postal ID', 'TIN ID', 'Other') NOT NULL,
        id_number VARCHAR(50) NOT NULL,
        
        -- File uploads
        selfie_path VARCHAR(255) NOT NULL,
        gov_id_path VARCHAR(255) NOT NULL,
        
        -- Status and timestamps
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create admin_notifications table
    await connection.execute(`
      CREATE TABLE admin_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        read_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Database tables created successfully!');
    console.log('📋 Users table includes all new fields:');
    console.log('   - Separated name fields (last_name, first_name, middle_name)');
    console.log('   - Personal info (gender, civil_status, email)');
    console.log('   - Detailed address fields');
    console.log('   - Mother\'s maiden name');
    console.log('   - ID information (type and number)');
    console.log('   - File uploads and status tracking');
    console.log('✅ Admin notifications table created');

  } catch (error) {
    console.error('❌ Error setting up database:', error);
  } finally {
    await connection.end();
  }
}

setupDatabase(); 