const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3000;

// Admin credentials (in production, use environment variables and hashed passwords)
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123',
  email: 'admin@microfinance.com' // Admin email for notifications
};

// Email configuration (you'll need to configure this with your email service)
const emailConfig = {
  service: 'gmail', // or your email service
  auth: {
    user: 'your-email@gmail.com', // Replace with your email
    pass: 'your-app-password' // Replace with your app password
  }
};

// Create email transporter
const transporter = nodemailer.createTransport(emailConfig);

// Function to send admin notification
async function sendAdminNotification(userInfo) {
  try {
    let notificationMessage = '';
    let notificationType = 'new_registration';
    
    // Determine notification type and message
    if (userInfo.action === 'phone_update') {
      notificationMessage = `Phone number update: ${userInfo.first_name} ${userInfo.last_name} updated phone to ${userInfo.phone_number}`;
      notificationType = 'phone_update';
    } else if (userInfo.duplicate_message) {
      notificationMessage = `Duplicate registration flagged: ${userInfo.first_name} ${userInfo.last_name} (${userInfo.phone_number}) - ${userInfo.duplicate_message}`;
      notificationType = 'duplicate_registration';
    } else if (userInfo.flagged_for_review) {
      notificationMessage = `Registration flagged for review: ${userInfo.first_name} ${userInfo.last_name} (${userInfo.phone_number}) - Potential duplicate detected`;
      notificationType = 'flagged_registration';
    } else {
      notificationMessage = `New user registration: ${userInfo.first_name} ${userInfo.last_name} (${userInfo.phone_number})`;
      notificationType = 'new_registration';
    }
    
    // Log the notification
    console.log(`📧 ADMIN NOTIFICATION:`);
    console.log(`🔔 ${notificationMessage}`);
    console.log(`   Type: ${notificationType}`);
    console.log(`   Admin Panel: http://localhost:3000/admin.html`);
    console.log(`📧 End of notification`);
    
    // Store notification in database for admin panel
    await db.query(`
      INSERT INTO admin_notifications (user_id, message, type, created_at) 
      VALUES (LAST_INSERT_ID(), ?, ?, NOW())
    `, [notificationMessage, notificationType]);
    
  } catch (error) {
    console.error('❌ Failed to send admin notification:', error);
    // Don't fail the registration if notification fails
  }
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Add static file serving for HTML files
app.use(express.static(__dirname));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple root route for testing
app.get('/', (req, res) => {
  res.json({ 
    message: 'Microfinance App Server is running!',
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Test route to check if routes are loading
app.get('/test-route', (req, res) => {
  res.json({ message: 'Test route works!' });
});

app.post('/test-post', (req, res) => {
  res.json({ message: 'Test POST route works!' });
});

// DB connection
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'fin_app_db'
});

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage: storage });

// ✅ Phone number validation endpoint
app.post('/validate-phone', async (req, res) => {
  try {
    const { phone_number } = req.body;
    
    if (!phone_number) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    // Check if phone number already exists
    console.log('🔍 VALIDATION 1: Checking phone number:', phone_number, 'Type:', typeof phone_number);
    const [existingPhone] = await db.query(
      "SELECT id, first_name, last_name, status FROM users WHERE phone_number = ?",
      [phone_number]
    );
    console.log('🔍 Phone validation query result:', existingPhone);

    if (existingPhone.length > 0) {
      const user = existingPhone[0];
      return res.json({
        exists: true,
        message: `This phone number is already registered. Please sign in with your existing account.`,
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          status: user.status
        }
      });
    }

    res.json({
      exists: false,
      message: "Phone number is available for registration."
    });

  } catch (err) {
    console.error("❌ Phone validation error:", err);
    res.status(500).json({ error: "Validation failed. Please try again." });
  }
});

// ✅ Name validation endpoint
app.post('/validate-name', async (req, res) => {
  try {
    const { first_name, last_name, middle_name, phone_number } = req.body;
    
    if (!first_name || !last_name) {
      return res.status(400).json({ error: "First name and last name are required" });
    }

    // Normalize input
    const normFirst = first_name ? first_name.trim().toLowerCase() : '';
    const normLast = last_name ? last_name.trim().toLowerCase() : '';
    const normMiddle = middle_name ? middle_name.trim().toLowerCase() : '';

    let existingName = [];
    let potentialDuplicates = [];
    
    // First, check for exact matches (including middle name if provided)
    if (normMiddle) {
      // Match on all three fields
      [existingName] = await db.query(
        `SELECT id, first_name, last_name, middle_name, phone_number, status FROM users
         WHERE LOWER(TRIM(first_name)) = ? AND LOWER(TRIM(last_name)) = ? AND LOWER(TRIM(middle_name)) = ?`,
        [normFirst, normLast, normMiddle]
      );
    } else {
      // Match on first and last name only
      [existingName] = await db.query(
        `SELECT id, first_name, last_name, middle_name, phone_number, status FROM users
         WHERE LOWER(TRIM(first_name)) = ? AND LOWER(TRIM(last_name)) = ?`,
        [normFirst, normLast]
      );
    }

    // If no exact match, check for potential duplicates (same first and last name, different middle name)
    if (existingName.length === 0) {
      [potentialDuplicates] = await db.query(
        `SELECT id, first_name, last_name, middle_name, phone_number, status FROM users
         WHERE LOWER(TRIM(first_name)) = ? AND LOWER(TRIM(last_name)) = ?`,
        [normFirst, normLast]
      );
    }

    if (existingName.length > 0) {
      const existingUser = existingName[0];
      console.log(`⚠️ Exact name match found: ${first_name} ${middle_name || ''} ${last_name} (ID: ${existingUser.id})`);
      // Clean up uploaded files since registration won't proceed
      if (fs.existsSync(selfiePath)) fs.unlinkSync(selfiePath);
      if (fs.existsSync(govIdPath)) fs.unlinkSync(govIdPath);
      
      console.log('🔄 Redirecting to error page for exact name match');
      return res.redirect(`/register-error.html?error=NAME_EXISTS&message=${encodeURIComponent(`An account with this exact name already exists. Would you like to add this phone number to your existing account?`)}`);
    }

    if (potentialDuplicates.length > 0) {
      console.log(`⚠️ Potential duplicate found: ${first_name} ${middle_name || ''} ${last_name} - ${potentialDuplicates.length} similar names exist`);
      
      // Store user info temporarily
      const userInfo = {
        last_name, first_name, middle_name,
        gender, civil_status, email, phone_number,
        country, province, city_municipality, barangay,
        subdivision_address1, street_address2, zipcode,
        mothers_maiden_name, valid_id_type, id_number,
        selfie: selfiePath,
        gov_id: govIdPath
      };

      // Generate OTP and proceed with registration, but flag for admin review
      const otp = generateOTP();
      await db.query(
        'INSERT INTO otps (phone_number, otp_code, user_info, flagged_for_review, created_at) VALUES (?, ?, ?, 1, NOW())',
        [phone_number, otp, JSON.stringify(userInfo)]
      );

      console.log('🔄 Proceeding with registration but flagged for admin review');
      return res.redirect('/verify.html?success=true&message=' + encodeURIComponent('Registration successful! OTP sent to your phone. Note: This registration has been flagged for admin review due to similar names in our system.'));
    }

    res.json({
      nameExists: false,
      message: "Name is available for registration."
    });

  } catch (err) {
    console.error("❌ Name validation error:", err);
    res.status(500).json({ error: "Validation failed. Please try again." });
  }
});

// ✅ Update phone number endpoint (for existing users)
app.post('/update-phone', async (req, res) => {
  try {
    const { user_id, new_phone_number } = req.body;
    
    if (!user_id || !new_phone_number) {
      return res.status(400).json({ error: "User ID and new phone number are required" });
    }

    // Check if new phone number is already used by another user
    const [existingPhone] = await db.query(
      "SELECT id FROM users WHERE phone_number = ? AND id != ?",
      [new_phone_number, user_id]
    );

    if (existingPhone.length > 0) {
      return res.status(400).json({ 
        error: "This phone number is already registered by another user." 
      });
    }

    // Update the phone number
    await db.query(
      "UPDATE users SET phone_number = ?, updated_at = NOW() WHERE id = ?",
      [new_phone_number, user_id]
    );

    console.log(`✅ Phone number updated for user ${user_id}: ${new_phone_number}`);
    
    res.json({
      success: true,
      message: "Phone number updated successfully. You can now login with the new phone number."
    });

  } catch (err) {
    console.error("❌ Update phone error:", err);
    res.status(500).json({ error: "Failed to update phone number. Please try again." });
  }
});

// ✅ Registration route for API calls (returns JSON)
app.post('/register', upload.fields([
  { name: 'selfie', maxCount: 1 },
  { name: 'gov_id', maxCount: 1 }
]), async (req, res) => {
  console.log('🚨 REGISTER API ROUTE HIT - API CALL');
  console.log('🚨 ==================================');
  
  try {
    console.log('📝 API registration request received');
    console.log('📝 Request body:', req.body);
    console.log('📝 Request files:', req.files);
    
    const { 
      last_name, first_name, middle_name,
      gender, civil_status, email, phone_number,
      country, province, city_municipality, barangay,
      subdivision_address1, street_address2, zipcode,
      mothers_maiden_name, valid_id_type, id_number
    } = req.body;
    
    // Check if files were uploaded
    if (!req.files || !req.files['selfie'] || !req.files['gov_id']) {
      console.log('❌ Missing files in request');
      return res.status(400).json({ 
        error: "Both selfie and government ID files are required" 
      });
    }
    
    const selfiePath = req.files['selfie'][0].path;
    const govIdPath = req.files['gov_id'][0].path;

    console.log('📝 File paths:', { selfiePath, govIdPath });

    // 🔍 VALIDATION 1: Check if phone number already exists
    console.log('🔍 VALIDATION 1: Checking phone number:', phone_number);
    const [existingPhone] = await db.query(
      "SELECT id, first_name, last_name, status FROM users WHERE phone_number = ?",
      [phone_number]
    );
    console.log('🔍 Phone validation query result:', existingPhone);

    if (existingPhone.length > 0) {
      const existingUser = existingPhone[0];
      console.log(`❌ Phone number ${phone_number} already registered by ${existingUser.first_name} ${existingUser.last_name}`);
      
      // Clean up uploaded files since registration won't proceed
      if (fs.existsSync(selfiePath)) fs.unlinkSync(selfiePath);
      if (fs.existsSync(govIdPath)) fs.unlinkSync(govIdPath);
      
      return res.status(400).json({
        error: "PHONE_EXISTS",
        message: `This phone number is already registered. Please sign in with your existing account.`,
        existingUser: {
          id: existingUser.id,
          first_name: existingUser.first_name,
          last_name: existingUser.last_name,
          status: existingUser.status
        }
      });
    }

    // 🔍 VALIDATION 2: Check if same name combination exists (UPDATED LOGIC)
    const normFirst = first_name ? first_name.trim().toLowerCase() : '';
    const normLast = last_name ? last_name.trim().toLowerCase() : '';
    const normMiddle = middle_name ? middle_name.trim().toLowerCase() : '';
    
    // Check for exact name matches (including middle name if provided)
    let exactNameQuery = '';
    let exactNameParams = [];
    
    if (normMiddle) {
      // If middle name provided, check for exact match on all three fields
      exactNameQuery = "SELECT id, first_name, last_name, middle_name, phone_number, status FROM users WHERE LOWER(TRIM(first_name)) = ? AND LOWER(TRIM(last_name)) = ? AND LOWER(TRIM(middle_name)) = ?";
      exactNameParams = [normFirst, normLast, normMiddle];
    } else {
      // If no middle name, check for exact match on first and last name only
      exactNameQuery = "SELECT id, first_name, last_name, middle_name, phone_number, status FROM users WHERE LOWER(TRIM(first_name)) = ? AND LOWER(TRIM(last_name)) = ? AND (middle_name IS NULL OR middle_name = '')";
      exactNameParams = [normFirst, normLast];
    }
    
    const [exactNameMatches] = await db.query(exactNameQuery, exactNameParams);
    
    // Check for potential duplicates (same first and last name, different middle name)
    const [potentialDuplicates] = await db.query(
      `SELECT id, first_name, last_name, middle_name, phone_number, status FROM users
       WHERE LOWER(TRIM(first_name)) = ? AND LOWER(TRIM(last_name)) = ?`,
      [normFirst, normLast]
    );

    // Determine if this is a duplicate case
    const isExactMatch = exactNameMatches.length > 0;
    const isPotentialDuplicate = potentialDuplicates.length > 0 && !isExactMatch;
    const isDuplicateCase = isExactMatch || isPotentialDuplicate;
    
    if (isDuplicateCase) {
      console.log(`⚠️ Duplicate name detected: ${first_name} ${middle_name || ''} ${last_name}`);
      
      // Check if this might be the same person (same name, different phone)
      let isSamePerson = false;
      let existingUser = null;
      
      if (isExactMatch) {
        existingUser = exactNameMatches[0];
        // If exact name match, this could be the same person with different phone
        isSamePerson = true;
      } else if (isPotentialDuplicate) {
        existingUser = potentialDuplicates[0];
        // For potential duplicates, we'll flag for admin review
        isSamePerson = false;
      }
      
      // Store user info temporarily
      const userInfo = {
        last_name, first_name, middle_name,
        gender, civil_status, email, phone_number,
        country, province, city_municipality, barangay,
        subdivision_address1, street_address2, zipcode,
        mothers_maiden_name, valid_id_type, id_number,
        selfie: selfiePath,
        gov_id: govIdPath,
        duplicate_detected: true,
        existing_user_id: existingUser ? existingUser.id : null,
        is_same_person: isSamePerson
      };

      // Generate OTP and proceed with registration, but flag for admin review
      const otp = generateOTP();
      await db.query(
        'INSERT INTO otps (phone_number, otp_code, user_info, flagged_for_review, created_at) VALUES (?, ?, ?, 1, NOW())',
        [phone_number, otp, JSON.stringify(userInfo)]
      );

      console.log('🔄 Proceeding with registration but flagged for admin review');
      
      // Professional message for duplicate detection
      const duplicateMessage = isSamePerson 
        ? 'Registration successful! OTP sent to your phone. Note: This registration has been flagged for admin review as we detected a potential duplicate account with the same name in our system.'
        : 'Registration successful! OTP sent to your phone. Note: This registration has been flagged for admin review due to similar names in our system.';
      
      return res.redirect('/verify.html?success=true&message=' + encodeURIComponent(duplicateMessage));
    }

    // ✅ All validations passed - proceed with registration
    console.log('✅ All validations passed, proceeding with registration');

    // Generate OTP
    const otp = generateOTP();
    console.log('📝 Generated OTP:', otp);

    // Save OTP to database
    await db.query(
      'INSERT INTO otps (phone_number, otp_code, created_at) VALUES (?, ?, NOW())',
      [phone_number, otp]
    );
    console.log('📝 OTP saved to database');

    // Store user info temporarily
    const userInfo = {
      last_name, first_name, middle_name,
      gender, civil_status, email, phone_number,
      country, province, city_municipality, barangay,
      subdivision_address1, street_address2, zipcode,
      mothers_maiden_name, valid_id_type, id_number,
      selfie: selfiePath,
      gov_id: govIdPath
    };

    console.log('📝 User info prepared:', userInfo);
    console.log(`📲 OTP for ${phone_number}: ${otp}`);
    
    const response = {
      success: true,
      message: '✅ OTP sent. Please check your phone.',
      userInfo: userInfo
    };
    
    console.log('📝 Sending JSON response:', response);
    res.json(response);
    
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ 
      error: "Registration failed. Please try again." 
    });
  }
});

// ✅ OTP Verification route
app.post('/verify-otp', async (req, res) => {
  const { otp, userInfo } = req.body;

  try {
    if (!otp) {
      return res.status(400).json({ error: "OTP is required." });
    }

    const [rows] = await db.query("SELECT * FROM otps WHERE otp_code = ? ORDER BY created_at DESC LIMIT 1", [otp]);

    if (rows.length === 0) {
      return res.status(400).json({ error: "Invalid OTP." });
    }

    const otpRecord = rows[0];
    let finalUserInfo = userInfo;

    // If no userInfo provided, try to get it from the OTP record
    if (!userInfo && otpRecord.user_info) {
      try {
        finalUserInfo = JSON.parse(otpRecord.user_info);
        console.log('📝 Retrieved user info from OTP record');
      } catch (err) {
        console.error('❌ Failed to parse user info from OTP record:', err);
        return res.status(400).json({ error: 'Invalid user information stored in OTP record.' });
      }
    }

    if (!finalUserInfo) {
      return res.status(400).json({ error: 'No user information provided or found.' });
    }

    // Verify that the OTP belongs to the same phone number
    if (otpRecord.phone_number !== finalUserInfo.phone_number) {
      return res.status(400).json({ error: "OTP does not match the registered phone number." });
    }

    // Check if this is a duplicate case and handle accordingly
    if (finalUserInfo.duplicate_detected) {
      console.log('⚠️ Processing duplicate registration case');
      
      if (finalUserInfo.is_same_person && finalUserInfo.existing_user_id) {
        // Same person, different phone - update existing user record
        console.log(`📱 Updating existing user ${finalUserInfo.existing_user_id} with new phone number ${finalUserInfo.phone_number}`);
        
        // Update the existing user's phone number
        await db.query(
          "UPDATE users SET phone_number = ? WHERE id = ?",
          [finalUserInfo.phone_number, finalUserInfo.existing_user_id]
        );
        
        // Clean up uploaded files since we're updating existing user
        if (fs.existsSync(finalUserInfo.selfie)) fs.unlinkSync(finalUserInfo.selfie);
        if (fs.existsSync(finalUserInfo.gov_id)) fs.unlinkSync(finalUserInfo.gov_id);
        
        // Send admin notification for phone number update
        await sendAdminNotification({
          ...finalUserInfo,
          action: 'phone_update',
          existing_user_id: finalUserInfo.existing_user_id,
          flagged_for_review: true
        });
        
        console.log(`✅ Phone number updated for existing user ${finalUserInfo.first_name} ${finalUserInfo.last_name}`);
        
        res.json({
          success: true,
          message: "✅ Phone number updated successfully. Your account is ready to use.",
          action: "close_window"
        });
      } else {
        // Different person or potential duplicate - create new user record
        console.log('👤 Creating new user record for potential duplicate');
        
        // Insert new user with all fields
        await db.query(`
          INSERT INTO users (
            last_name, first_name, middle_name,
            gender, civil_status, email, phone_number,
            country, province, city_municipality, barangay,
            subdivision_address1, street_address2, zipcode,
            mothers_maiden_name, valid_id_type, id_number,
            selfie_path, gov_id_path, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          finalUserInfo.last_name, finalUserInfo.first_name, finalUserInfo.middle_name,
          finalUserInfo.gender, finalUserInfo.civil_status, finalUserInfo.email, finalUserInfo.phone_number,
          finalUserInfo.country, finalUserInfo.province, finalUserInfo.city_municipality, finalUserInfo.barangay,
          finalUserInfo.subdivision_address1, finalUserInfo.street_address2, finalUserInfo.zipcode,
          finalUserInfo.mothers_maiden_name, finalUserInfo.valid_id_type, finalUserInfo.id_number,
          finalUserInfo.selfie, finalUserInfo.gov_id, 'pending'
        ]);
        
        // Send admin notification for duplicate review
        await sendAdminNotification({
          ...finalUserInfo,
          flagged_for_review: true,
          potential_duplicates: true,
          duplicate_message: "The last name and first name has duplicate registration"
        });
        
        console.log(`✅ New user created for potential duplicate: ${finalUserInfo.first_name} ${finalUserInfo.last_name}`);
        
        res.json({
          success: true,
          message: "✅ OTP verified. Registration submitted for admin approval.",
          action: "close_window"
        });
      }
    } else {
      // Regular registration - create new user
      console.log('✅ Processing regular registration');
      
      // Insert user with all new fields
      await db.query(`
        INSERT INTO users (
          last_name, first_name, middle_name,
          gender, civil_status, email, phone_number,
          country, province, city_municipality, barangay,
          subdivision_address1, street_address2, zipcode,
          mothers_maiden_name, valid_id_type, id_number,
          selfie_path, gov_id_path, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        finalUserInfo.last_name, finalUserInfo.first_name, finalUserInfo.middle_name,
        finalUserInfo.gender, finalUserInfo.civil_status, finalUserInfo.email, finalUserInfo.phone_number,
        finalUserInfo.country, finalUserInfo.province, finalUserInfo.city_municipality, finalUserInfo.barangay,
        finalUserInfo.subdivision_address1, finalUserInfo.street_address2, finalUserInfo.zipcode,
        finalUserInfo.mothers_maiden_name, finalUserInfo.valid_id_type, finalUserInfo.id_number,
        finalUserInfo.selfie, finalUserInfo.gov_id, 'pending'
      ]);

      // Send regular admin notification
      await sendAdminNotification(finalUserInfo);
      
      console.log(`✅ Registration completed for ${finalUserInfo.first_name} ${finalUserInfo.last_name} (${finalUserInfo.phone_number})`);
      
      res.json({
        success: true,
        message: "✅ OTP verified. Registration submitted for admin approval.",
        action: "close_window"
      });
    }

    // Clean up the OTP record
    await db.query("DELETE FROM otps WHERE id = ?", [otpRecord.id]);
  } catch (err) {
    console.error("❌ OTP verification error:", err);
    res.status(500).json({ error: `Server error: ${err.message}` });
  }
});

// ✅ Registration route for form submissions (always redirects)
app.post('/register-form', upload.fields([
  { name: 'selfie', maxCount: 1 },
  { name: 'gov_id', maxCount: 1 }
]), async (req, res) => {
  console.log('🚨 REGISTER-FORM ROUTE HIT - FORM SUBMISSION');
  console.log('🚨 ==========================================');
  
  try {
    console.log('📝 Form submission received');
    console.log('📝 Request body:', req.body);
    console.log('📝 Request files:', req.files);
    
    const { 
      last_name, first_name, middle_name,
      gender, civil_status, email, phone_number,
      country, province, city_municipality, barangay,
      subdivision_address1, street_address2, zipcode,
      mothers_maiden_name, valid_id_type, id_number
    } = req.body;
    
    // Check if files were uploaded
    if (!req.files || !req.files['selfie'] || !req.files['gov_id']) {
      console.log('❌ Missing files in request');
      return res.redirect(`/register-error.html?error=MISSING_FILES&message=${encodeURIComponent('Both selfie and government ID files are required')}`);
    }
    
    const selfiePath = req.files['selfie'][0].path;
    const govIdPath = req.files['gov_id'][0].path;

    console.log('📝 File paths:', { selfiePath, govIdPath });

    // 🔍 VALIDATION 1: Check if phone number already exists
    console.log('🔍 VALIDATION 1: Checking phone number:', phone_number);
    const [existingPhone] = await db.query(
      "SELECT id, first_name, last_name, status FROM users WHERE phone_number = ?",
      [phone_number]
    );
    console.log('🔍 Phone validation query result:', existingPhone);

    if (existingPhone.length > 0) {
      const existingUser = existingPhone[0];
      console.log(`❌ Phone number ${phone_number} already registered by ${existingUser.first_name} ${existingUser.last_name}`);
      
      // Clean up uploaded files since registration won't proceed
      if (fs.existsSync(selfiePath)) fs.unlinkSync(selfiePath);
      if (fs.existsSync(govIdPath)) fs.unlinkSync(govIdPath);
      
      console.log('🔄 Redirecting to error page for phone exists');
      return res.redirect(`/register-error.html?error=PHONE_EXISTS&message=${encodeURIComponent(`This phone number is already registered. Please sign in with your existing account.`)}`);
    }

    // 🔍 VALIDATION 2: Check if same name combination exists (UPDATED LOGIC)
    const normFirst = first_name ? first_name.trim().toLowerCase() : '';
    const normLast = last_name ? last_name.trim().toLowerCase() : '';
    const normMiddle = middle_name ? middle_name.trim().toLowerCase() : '';
    
    // Check for exact name matches (including middle name if provided)
    let exactNameQuery = '';
    let exactNameParams = [];
    
    if (normMiddle) {
      // If middle name provided, check for exact match on all three fields
      exactNameQuery = "SELECT id, first_name, last_name, middle_name, phone_number, status FROM users WHERE LOWER(TRIM(first_name)) = ? AND LOWER(TRIM(last_name)) = ? AND LOWER(TRIM(middle_name)) = ?";
      exactNameParams = [normFirst, normLast, normMiddle];
    } else {
      // If no middle name, check for exact match on first and last name only
      exactNameQuery = "SELECT id, first_name, last_name, middle_name, phone_number, status FROM users WHERE LOWER(TRIM(first_name)) = ? AND LOWER(TRIM(last_name)) = ? AND (middle_name IS NULL OR middle_name = '')";
      exactNameParams = [normFirst, normLast];
    }
    
    const [exactNameMatches] = await db.query(exactNameQuery, exactNameParams);
    
    // Check for potential duplicates (same first and last name, different middle name)
    const [potentialDuplicates] = await db.query(
      `SELECT id, first_name, last_name, middle_name, phone_number, status FROM users
       WHERE LOWER(TRIM(first_name)) = ? AND LOWER(TRIM(last_name)) = ?`,
      [normFirst, normLast]
    );

    // Determine if this is a duplicate case
    const isExactMatch = exactNameMatches.length > 0;
    const isPotentialDuplicate = potentialDuplicates.length > 0 && !isExactMatch;
    const isDuplicateCase = isExactMatch || isPotentialDuplicate;
    
    if (isDuplicateCase) {
      console.log(`⚠️ Duplicate name detected: ${first_name} ${middle_name || ''} ${last_name}`);
      
      // Check if this might be the same person (same name, different phone)
      let isSamePerson = false;
      let existingUser = null;
      
      if (isExactMatch) {
        existingUser = exactNameMatches[0];
        // If exact name match, this could be the same person with different phone
        isSamePerson = true;
      } else if (isPotentialDuplicate) {
        existingUser = potentialDuplicates[0];
        // For potential duplicates, we'll flag for admin review
        isSamePerson = false;
      }
      
      // Store user info temporarily
      const userInfo = {
        last_name, first_name, middle_name,
        gender, civil_status, email, phone_number,
        country, province, city_municipality, barangay,
        subdivision_address1, street_address2, zipcode,
        mothers_maiden_name, valid_id_type, id_number,
        selfie: selfiePath,
        gov_id: govIdPath,
        duplicate_detected: true,
        existing_user_id: existingUser ? existingUser.id : null,
        is_same_person: isSamePerson
      };

      // Generate OTP and proceed with registration, but flag for admin review
      const otp = generateOTP();
      await db.query(
        'INSERT INTO otps (phone_number, otp_code, user_info, flagged_for_review, created_at) VALUES (?, ?, ?, 1, NOW())',
        [phone_number, otp, JSON.stringify(userInfo)]
      );

      console.log('🔄 Proceeding with registration but flagged for admin review');
      
      // Professional message for duplicate detection
      const duplicateMessage = isSamePerson 
        ? 'Registration successful! OTP sent to your phone. Note: This registration has been flagged for admin review as we detected a potential duplicate account with the same name in our system.'
        : 'Registration successful! OTP sent to your phone. Note: This registration has been flagged for admin review due to similar names in our system.';
      
      return res.redirect('/verify.html?success=true&message=' + encodeURIComponent(duplicateMessage));
    }

    // ✅ All validations passed - proceed with registration
    console.log('✅ All validations passed, proceeding with registration');

    // Generate OTP
    const otp = generateOTP();
    console.log('📝 Generated OTP:', otp);

    // Store user info temporarily in a simple way for form submissions
    // We'll store it in the OTP record itself as a JSON string
    const userInfo = {
      last_name, first_name, middle_name,
      gender, civil_status, email, phone_number,
      country, province, city_municipality, barangay,
      subdivision_address1, street_address2, zipcode,
      mothers_maiden_name, valid_id_type, id_number,
      selfie: selfiePath,
      gov_id: govIdPath
    };

    // Save OTP to database with user info
    await db.query(
      'INSERT INTO otps (phone_number, otp_code, user_info, created_at) VALUES (?, ?, ?, NOW())',
      [phone_number, otp, JSON.stringify(userInfo)]
    );
    console.log('📝 OTP saved to database with user info');

    console.log('📝 User info prepared:', userInfo);
    console.log(`📲 OTP for ${phone_number}: ${otp}`);
    
    // Store user info in session or temporary storage for OTP verification
    // For now, we'll redirect to verify page with success message
    console.log('🔄 Redirecting to verify page for successful registration');
    return res.redirect('/verify.html?success=true&message=' + encodeURIComponent('Registration successful! OTP sent to your phone.'));
    
  } catch (err) {
    console.error("❌ Registration error:", err);
    return res.redirect(`/register-error.html?error=SERVER_ERROR&message=${encodeURIComponent('Registration failed. Please try again.')}`);
  }
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

// Admin routes
app.get('/admin/pending', async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM users WHERE status = 'pending' ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    console.error("❌ Error loading pending users:", err);
    res.status(500).json({ error: "Failed to load pending users" });
  }
});

app.get('/admin/approved', async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM users WHERE status = 'approved' ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    console.error("❌ Error loading approved users:", err);
    res.status(500).json({ error: "Failed to load approved users" });
  }
});

app.get('/admin/rejected', async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM users WHERE status = 'rejected' ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    console.error("❌ Error loading rejected users:", err);
    res.status(500).json({ error: "Failed to load rejected users" });
  }
});

app.post('/admin/approve/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    await db.query("UPDATE users SET status = 'approved' WHERE id = ?", [userId]);
    console.log(`✅ User ${userId} approved`);
    res.json({ success: true, message: "User approved successfully" });
  } catch (err) {
    console.error("❌ Error approving user:", err);
    res.status(500).json({ error: "Failed to approve user" });
  }
});

app.post('/admin/reject/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    await db.query("UPDATE users SET status = 'rejected' WHERE id = ?", [userId]);
    console.log(`❌ User ${userId} rejected`);
    res.json({ success: true, message: "User rejected successfully" });
  } catch (err) {
    console.error("❌ Error rejecting user:", err);
    res.status(500).json({ error: "Failed to reject user" });
  }
});

// Admin login route
app.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      // Generate a simple token (in production, use JWT)
      const token = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      
      console.log(`✅ Admin login successful: ${username}`);
      res.json({ 
        success: true, 
        message: "Login successful",
        token: token
      });
    } else {
      console.log(`❌ Admin login failed: ${username}`);
      res.status(401).json({ error: "Invalid username or password" });
    }
  } catch (err) {
    console.error("❌ Admin login error:", err);
    res.status(500).json({ error: "Server error during login" });
  }
});

// User login route
app.post('/user/login', async (req, res) => {
  try {
    const { phone_number } = req.body;

    if (!phone_number) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    // Check if user exists and is approved
    const [rows] = await db.query(
      "SELECT * FROM users WHERE phone_number = ? AND status = 'approved'",
      [phone_number]
    );

    if (rows.length === 0) {
      console.log(`❌ User login failed: ${phone_number} - not found or not approved`);
      return res.status(401).json({ 
        error: "Account not found or not yet approved. Please contact admin." 
      });
    }

    const user = rows[0];
    console.log(`✅ User login successful: ${phone_number} (${user.first_name} ${user.last_name})`);
    
    res.json({ 
      success: true, 
      message: "Login successful",
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number,
        email: user.email,
        status: user.status
      }
    });
  } catch (err) {
    console.error("❌ User login error:", err);
    res.status(500).json({ error: "Server error during login" });
  }
});

// Get user profile route
app.get('/user/profile/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    const [rows] = await db.query(
      "SELECT * FROM users WHERE id = ? AND status = 'approved'",
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found or not approved" });
    }

    const user = rows[0];
    res.json({ 
      success: true, 
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        middle_name: user.middle_name,
        gender: user.gender,
        civil_status: user.civil_status,
        email: user.email,
        phone_number: user.phone_number,
        country: user.country,
        province: user.province,
        city_municipality: user.city_municipality,
        barangay: user.barangay,
        subdivision_address1: user.subdivision_address1,
        street_address2: user.street_address2,
        zipcode: user.zipcode,
        mothers_maiden_name: user.mothers_maiden_name,
        valid_id_type: user.valid_id_type,
        id_number: user.id_number,
        selfie_path: user.selfie_path,
        gov_id_path: user.gov_id_path,
        status: user.status,
        created_at: user.created_at
      }
    });
  } catch (err) {
    console.error("❌ Get user profile error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get admin notifications
app.get('/admin/notifications', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT n.*, u.first_name, u.last_name, u.phone_number 
      FROM admin_notifications n 
      LEFT JOIN users u ON n.user_id = u.id 
      ORDER BY n.created_at DESC 
      LIMIT 10
    `);
    res.json(rows);
  } catch (err) {
    console.error("❌ Error loading notifications:", err);
    res.status(500).json({ error: "Failed to load notifications" });
  }
});

// Mark notification as read
app.post('/admin/notifications/:id/read', async (req, res) => {
  try {
    const notificationId = req.params.id;
    await db.query("UPDATE admin_notifications SET read_at = NOW() WHERE id = ?", [notificationId]);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error marking notification as read:", err);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

app.get('/admin/flagged', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.*, n.message as flag_message, n.created_at as flagged_at
      FROM users u 
      LEFT JOIN admin_notifications n ON u.id = n.user_id 
      WHERE n.type = 'potential_duplicate' 
      ORDER BY n.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("❌ Error loading flagged users:", err);
    res.status(500).json({ error: "Failed to load flagged users" });
  }
});
