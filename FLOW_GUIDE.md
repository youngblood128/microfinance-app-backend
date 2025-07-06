# Microfinance App - Complete Flow Guide

## 🚀 Complete User Journey

### **Step 1: User Registration**
- **File**: `register.html`
- **Action**: User fills registration form with personal info and uploads documents
- **Result**: OTP is generated and sent to user's phone
- **Next**: Page automatically redirects to `verify.html`

### **Step 2: OTP Verification**
- **File**: `verify.html`
- **Action**: User enters the 6-digit OTP received on their phone
- **Result**: Account is created with 'pending' status
- **Next**: Page automatically redirects to `login.html`

### **Step 3: Admin Login**
- **File**: `login.html`
- **Action**: Admin enters credentials (username: `admin`, password: `admin123`)
- **Result**: Admin is authenticated and session is created
- **Next**: Page automatically redirects to `admin.html`

### **Step 4: Admin Panel**
- **File**: `admin.html`
- **Action**: Admin reviews pending registrations and approves/rejects users
- **Result**: User status is updated to 'approved' or 'rejected'
- **Next**: Admin can continue managing users or logout

## 🔐 Admin Credentials
- **Username**: `admin`
- **Password**: `admin123`

## 📁 File Structure
```
microfinance-app-backend/
├── register.html      # User registration form
├── verify.html        # OTP verification page
├── login.html         # Admin login page
├── admin.html         # Admin panel for user management
├── server.js          # Backend server with all routes
└── uploads/           # Directory for uploaded files
```

## 🔄 Automatic Flow
1. `register.html` → `verify.html` (after successful registration)
2. `verify.html` → `login.html` (after successful OTP verification)
3. `login.html` → `admin.html` (after successful admin login)

## 🛡️ Security Features
- Admin authentication required for admin panel access
- Session management using localStorage
- Automatic logout functionality
- Protected admin routes

## 🎯 How to Test
1. Open `register.html` and complete registration
2. Check server console for OTP
3. Enter OTP in `verify.html`
4. Login as admin in `login.html`
5. Manage users in `admin.html`

## 📱 Server Endpoints
- `POST /register` - User registration
- `POST /verify-otp` - OTP verification
- `POST /admin/login` - Admin authentication
- `GET /admin/pending` - Get pending users
- `GET /admin/approved` - Get approved users
- `GET /admin/rejected` - Get rejected users
- `POST /admin/approve/:id` - Approve user
- `POST /admin/reject/:id` - Reject user 