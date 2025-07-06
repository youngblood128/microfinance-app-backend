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

console.log('🚀 Starting debug server...');

// Database connection
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'fin_app_db'
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Add static file serving for HTML files
app.use(express.static(__dirname));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log('✅ Middleware loaded');

// Multer storage for file uploads
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

// Simple root route for testing
app.get('/', (req, res) => {
  res.json({ 
    message: 'Debug Server is running!',
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
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await db.query(
        'INSERT INTO otps (phone_number, otp_code, user_info, flagged_for_review, created_at) VALUES (?, ?, ?, 1, NOW())',
        [phone_number, otp, JSON.stringify(userInfo)]
      );

      console.log('🔄 Proceeding with registration but flagged for admin review');
      console.log('📝 Generated OTP for duplicate case:', otp);
      console.log('📝 User info prepared:', userInfo);
      console.log(`📲 OTP for ${phone_number}: ${otp}`);
      
      // Professional message for duplicate detection
      const duplicateMessage = isSamePerson 
        ? 'Registration successful! OTP sent to your phone. Note: This registration has been flagged for admin review as we detected a potential duplicate account with the same name in our system.'
        : 'Registration successful! OTP sent to your phone. Note: This registration has been flagged for admin review due to similar names in our system.';
      
      // Return HTML page that stores user info in localStorage before redirecting
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Processing Registration</title>
        </head>
        <body>
          <script>
            // Store user info in localStorage
            localStorage.setItem('pendingUserInfo', '${JSON.stringify(userInfo).replace(/'/g, "\\'")}');
            // Redirect to verify page
            window.location.href = '/verify.html?success=true&message=${encodeURIComponent(duplicateMessage)}';
          </script>
          <p>Processing your registration...</p>
        </body>
        </html>
      `);
    }

    // ✅ All validations passed - proceed with registration
    console.log('✅ All validations passed, proceeding with registration');

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
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
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Processing Registration</title>
      </head>
      <body>
        <script>
          // Store user info in localStorage
          localStorage.setItem('pendingUserInfo', '${JSON.stringify(userInfo).replace(/'/g, "\\'")}');
          // Redirect to verify page
          window.location.href = '/verify.html?success=true&message=${encodeURIComponent('Registration successful! OTP sent to your phone.')}';
        </script>
        <p>Processing your registration...</p>
      </body>
      </html>
    `);
    
  } catch (err) {
    console.error("❌ Registration error:", err);
    return res.redirect(`/register-error.html?error=SERVER_ERROR&message=${encodeURIComponent('Registration failed. Please try again.')}`);
  }
});

// /register route for debug server
app.post('/register', upload.fields([
  { name: 'selfie', maxCount: 1 },
  { name: 'gov_id', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      last_name, first_name, middle_name,
      gender, civil_status, email, phone_number,
      country, province, city_municipality, barangay,
      subdivision_address1, street_address2, zipcode,
      mothers_maiden_name, valid_id_type, id_number
    } = req.body;

    // Check if files were uploaded
    if (!req.files || !req.files['selfie'] || !req.files['gov_id']) {
      return res.status(400).json({ error: "Both selfie and government ID files are required" });
    }
    const selfiePath = req.files['selfie'][0].path;
    const govIdPath = req.files['gov_id'][0].path;

    // VALIDATION 1: Check if phone number already exists
    const [existingPhone] = await db.query(
      "SELECT id, first_name, last_name, status FROM users WHERE phone_number = ?",
      [phone_number]
    );
    if (existingPhone.length > 0) {
      if (fs.existsSync(selfiePath)) fs.unlinkSync(selfiePath);
      if (fs.existsSync(govIdPath)) fs.unlinkSync(govIdPath);
      return res.status(400).json({
        error: "PHONE_EXISTS",
        message: `This phone number is already registered. Please sign in with your existing account.`,
        existingUser: existingPhone[0]
      });
    }

    // VALIDATION 2: Duplicate name logic
    const normFirst = first_name ? first_name.trim().toLowerCase() : '';
    const normLast = last_name ? last_name.trim().toLowerCase() : '';
    const normMiddle = middle_name ? middle_name.trim().toLowerCase() : '';
    let exactNameQuery = '';
    let exactNameParams = [];
    if (normMiddle) {
      exactNameQuery = "SELECT id, first_name, last_name, middle_name, phone_number, status FROM users WHERE LOWER(TRIM(first_name)) = ? AND LOWER(TRIM(last_name)) = ? AND LOWER(TRIM(middle_name)) = ?";
      exactNameParams = [normFirst, normLast, normMiddle];
    } else {
      exactNameQuery = "SELECT id, first_name, last_name, middle_name, phone_number, status FROM users WHERE LOWER(TRIM(first_name)) = ? AND LOWER(TRIM(last_name)) = ? AND (middle_name IS NULL OR middle_name = '')";
      exactNameParams = [normFirst, normLast];
    }
    const [exactNameMatches] = await db.query(exactNameQuery, exactNameParams);
    const [potentialDuplicates] = await db.query(
      `SELECT id, first_name, last_name, middle_name, phone_number, status FROM users
       WHERE LOWER(TRIM(first_name)) = ? AND LOWER(TRIM(last_name)) = ?`,
      [normFirst, normLast]
    );
    const isExactMatch = exactNameMatches.length > 0;
    const isPotentialDuplicate = potentialDuplicates.length > 0 && !isExactMatch;
    const isDuplicateCase = isExactMatch || isPotentialDuplicate;
    if (isDuplicateCase) {
      let isSamePerson = false;
      let existingUser = null;
      if (isExactMatch) {
        existingUser = exactNameMatches[0];
        isSamePerson = true;
      } else if (isPotentialDuplicate) {
        existingUser = potentialDuplicates[0];
        isSamePerson = false;
      }
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
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await db.query(
        'INSERT INTO otps (phone_number, otp_code, user_info, flagged_for_review, created_at) VALUES (?, ?, ?, 1, NOW())',
        [phone_number, otp, JSON.stringify(userInfo)]
      );
      console.log('🔄 Proceeding with registration but flagged for admin review');
      console.log('📝 Generated OTP for duplicate case:', otp);
      console.log('📝 User info prepared:', userInfo);
      console.log(`📲 OTP for ${phone_number}: ${otp}`);
      const duplicateMessage = isSamePerson 
        ? 'Registration successful! OTP sent to your phone. Note: This registration has been flagged for admin review as we detected a potential duplicate account with the same name in our system.'
        : 'Registration successful! OTP sent to your phone. Note: This registration has been flagged for admin review due to similar names in our system.';
      return res.json({
        success: true,
        message: duplicateMessage,
        userInfo: userInfo
      });
    }
    // All validations passed - proceed with registration
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await db.query(
      'INSERT INTO otps (phone_number, otp_code, user_info, created_at) VALUES (?, ?, ?, NOW())',
      [phone_number, otp, JSON.stringify({
        last_name, first_name, middle_name,
        gender, civil_status, email, phone_number,
        country, province, city_municipality, barangay,
        subdivision_address1, street_address2, zipcode,
        mothers_maiden_name, valid_id_type, id_number,
        selfie: selfiePath,
        gov_id: govIdPath
      })]
    );
    res.json({
      success: true,
      message: '✅ OTP sent. Please check your phone.',
      userInfo: {
        last_name, first_name, middle_name,
        gender, civil_status, email, phone_number,
        country, province, city_municipality, barangay,
        subdivision_address1, street_address2, zipcode,
        mothers_maiden_name, valid_id_type, id_number,
        selfie: selfiePath,
        gov_id: govIdPath
      }
    });
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

// User login endpoint
app.post('/user/login', async (req, res) => {
  try {
    const { phone_number } = req.body;
    
    if (!phone_number) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    console.log('🔍 LOGIN: Checking phone number:', phone_number);
    
    // Check if user exists with this phone number
    const [users] = await db.query(
      "SELECT id, first_name, last_name, middle_name, phone_number, status FROM users WHERE phone_number = ?",
      [phone_number]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found. Please register first." });
    }

    const user = users[0];
    console.log(`👤 User found: ${user.first_name} ${user.last_name} (Status: ${user.status})`);

    // Check if user is approved
    if (user.status !== 'approved') {
      return res.status(403).json({ 
        error: "Account not approved. Please wait for admin approval.",
        status: user.status
      });
    }

    // Login successful
    console.log(`✅ Login successful for ${user.first_name} ${user.last_name}`);
    
    res.json({
      success: true,
      message: "Login successful!",
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        middle_name: user.middle_name,
        phone_number: user.phone_number,
        status: user.status
      }
    });

  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// User profile endpoint
app.get('/user/profile/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    console.log('🔍 PROFILE: Loading profile for user ID:', userId);
    
    // Get full user profile from database
    const [users] = await db.query(
      `SELECT id, first_name, last_name, middle_name, gender, civil_status, 
              email, phone_number, country, province, city_municipality, barangay,
              subdivision_address1, street_address2, zipcode, mothers_maiden_name,
              valid_id_type, id_number, selfie_path, gov_id_path, status
       FROM users WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = users[0];
    console.log(`👤 Profile loaded for: ${user.first_name} ${user.last_name}`);

    res.json({
      success: true,
      user: user
    });

  } catch (err) {
    console.error("❌ Profile loading error:", err);
    res.status(500).json({ error: "Failed to load profile. Please try again." });
  }
});

// Admin login endpoint
app.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    console.log('🔍 ADMIN LOGIN: Attempting login for username:', username);
    
    // For demo purposes, use hardcoded admin credentials
    // In production, this should check against a database
    if (username === 'admin' && password === 'admin123') {
      console.log('✅ Admin login successful');
      
      res.json({
        success: true,
        message: "Login successful!",
        token: "demo-admin-token-" + Date.now()
      });
    } else {
      console.log('❌ Admin login failed: Invalid credentials');
      
      res.status(401).json({
        error: "Invalid username or password"
      });
    }

  } catch (err) {
    console.error("❌ Admin login error:", err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// Admin endpoints for user management
app.get('/admin/pending', async (req, res) => {
  try {
    console.log('🔍 ADMIN: Loading pending users');
    const [users] = await db.query(
      `SELECT id, first_name, last_name, middle_name, phone_number, email, 
              civil_status, gender, created_at, status, selfie_path, gov_id_path, mothers_maiden_name, country, province, city_municipality, barangay, subdivision_address1, street_address2, zipcode, valid_id_type, id_number, updated_at
       FROM users WHERE status = 'pending'
       ORDER BY created_at DESC`
    );
    console.log(`📊 Found ${users.length} pending users`);
    res.json(users);
  } catch (err) {
    console.error("❌ Error loading pending users:", err);
    res.status(500).json({ error: "Failed to load pending users" });
  }
});

app.get('/admin/approved', async (req, res) => {
  try {
    console.log('🔍 ADMIN: Loading approved users');
    const [users] = await db.query(
      `SELECT id, first_name, last_name, middle_name, phone_number, email, 
              civil_status, gender, created_at, status, selfie_path, gov_id_path, mothers_maiden_name, country, province, city_municipality, barangay, subdivision_address1, street_address2, zipcode, valid_id_type, id_number, updated_at
       FROM users WHERE status = 'approved'
       ORDER BY created_at DESC`
    );
    console.log(`📊 Found ${users.length} approved users`);
    res.json(users);
  } catch (err) {
    console.error("❌ Error loading approved users:", err);
    res.status(500).json({ error: "Failed to load approved users" });
  }
});

app.get('/admin/rejected', async (req, res) => {
  try {
    console.log('🔍 ADMIN: Loading rejected users');
    const [users] = await db.query(
      `SELECT id, first_name, last_name, middle_name, phone_number, email, 
              civil_status, gender, created_at, status, selfie_path, gov_id_path, mothers_maiden_name, country, province, city_municipality, barangay, subdivision_address1, street_address2, zipcode, valid_id_type, id_number, updated_at
       FROM users WHERE status = 'rejected'
       ORDER BY created_at DESC`
    );
    console.log(`📊 Found ${users.length} rejected users`);
    res.json(users);
  } catch (err) {
    console.error("❌ Error loading rejected users:", err);
    res.status(500).json({ error: "Failed to load rejected users" });
  }
});

app.get('/admin/notifications', async (req, res) => {
  try {
    console.log('🔍 ADMIN: Loading notifications');
    
    // Get flagged OTPs for admin review
    const [flaggedOtps] = await db.query(`
      SELECT id, phone_number, user_info, created_at, flagged_for_review
      FROM otps 
      WHERE flagged_for_review = 1 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    // Get recent user registrations
    const [recentUsers] = await db.query(`
      SELECT id, first_name, last_name, phone_number, created_at, status
      FROM users 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    // Format notifications with proper structure
    const notifications = [];
    
    // Add flagged OTP notifications
    flaggedOtps.forEach(otp => {
      try {
        const userInfo = JSON.parse(otp.user_info);
        notifications.push({
          id: `otp_${otp.id}`,
          type: 'flagged_registration',
          title: 'Flagged Registration',
          message: `Registration flagged for review: ${userInfo.first_name} ${userInfo.last_name} (${otp.phone_number})`,
          user_name: `${userInfo.first_name} ${userInfo.last_name}`,
          phone_number: otp.phone_number,
          created_at: otp.created_at,
          priority: 'high'
        });
      } catch (e) {
        console.error('Error parsing user info:', e);
      }
    });
    
    // Add recent user notifications
    recentUsers.forEach(user => {
      notifications.push({
        id: `user_${user.id}`,
        type: 'new_registration',
        title: 'New Registration',
        message: `New user registered: ${user.first_name} ${user.last_name} (${user.phone_number})`,
        user_name: `${user.first_name} ${user.last_name}`,
        phone_number: user.phone_number,
        created_at: user.created_at,
        status: user.status,
        priority: 'medium'
      });
    });
    
    // Sort by creation date
    notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    console.log(`📊 Found ${flaggedOtps.length} flagged reviews and ${recentUsers.length} recent registrations`);
    res.json(notifications);
  } catch (err) {
    console.error("❌ Error loading notifications:", err);
    res.status(500).json({ error: "Failed to load notifications" });
  }
});

// Mark notification as read
app.post('/admin/notifications/:id/read', async (req, res) => {
  try {
    const notificationId = req.params.id;
    console.log('🔍 ADMIN: Marking notification as read:', notificationId);
    
    // For demo purposes, we'll just return success
    // In a real app, you'd update a read_at timestamp in the database
    console.log('✅ Notification marked as read:', notificationId);
    
    res.json({ success: true, message: "Notification marked as read" });
  } catch (err) {
    console.error("❌ Error marking notification as read:", err);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

// Approve user
app.post('/admin/approve/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    console.log('🔍 ADMIN: Approving user ID:', userId);
    
    // Update user status to approved
    await db.query(
      'UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?',
      ['approved', userId]
    );
    
    // Get user info for logging
    const [users] = await db.query(
      'SELECT first_name, last_name, phone_number FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length > 0) {
      const user = users[0];
      console.log(`✅ User approved: ${user.first_name} ${user.last_name} (${user.phone_number})`);
    }
    
    res.json({ success: true, message: "User approved successfully" });
  } catch (err) {
    console.error("❌ Error approving user:", err);
    res.status(500).json({ error: "Failed to approve user" });
  }
});

// Reject user
app.post('/admin/reject/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    console.log('🔍 ADMIN: Rejecting user ID:', userId);
    
    // Update user status to rejected
    await db.query(
      'UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?',
      ['rejected', userId]
    );
    
    // Get user info for logging
    const [users] = await db.query(
      'SELECT first_name, last_name, phone_number FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length > 0) {
      const user = users[0];
      console.log(`❌ User rejected: ${user.first_name} ${user.last_name} (${user.phone_number})`);
    }
    
    res.json({ success: true, message: "User rejected successfully" });
  } catch (err) {
    console.error("❌ Error rejecting user:", err);
    res.status(500).json({ error: "Failed to reject user" });
  }
});

console.log('✅ Routes loaded');

// Start server
app.listen(PORT, () => {
  console.log(`✅ Debug server running at http://localhost:${PORT}`);
  console.log('✅ Server should stay running...');
});

// Handle process exit
process.on('exit', (code) => {
  console.log(`❌ Server exiting with code: ${code}`);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
}); 