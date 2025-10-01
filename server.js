// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const request = require('request');
const jwt = require('jsonwebtoken');
const { 
  upsertUser, getUserByUniqueId, getUserByEmail, getAllUsers, getUserCount, setUserRole, seedSuperAdmins,
  upsertStudent, getStudentByEmail, getStudentByZetaId, getAllStudents, getStudentCount, deleteStudentByEmail, deleteStudentByZetaId
} = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://bees-dgqz.onrender.com';

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan('combined')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(express.static(path.join(__dirname))); // Serve static files

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/hello', (req, res) => {
  res.json({
    message: 'Hello from the API!',
    data: {
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// Zoho OAuth endpoints
app.get('/authredirction', (req, res) => {
  console.log('=== /authredirction API Called ===');
  console.log('Request headers:', req.headers);
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  
  // Get all OAuth parameters from environment variables with fallbacks
  const clientId = process.env.ZOHO_CLIENT_ID || '1000.9OLXK925B3ZYBG3SXCSQSX5WYS251A';
  const clientSecret = process.env.ZOHO_CLIENT_SECRET || '112e208ce2abddeac835b26d228580362477ba9653';
  const redirectUrl = process.env.ZOHO_REDIRECT_URL || `${APP_BASE_URL}/getCode`;
  const scope = process.env.ZOHO_SCOPE || 'email';
  const responseType = process.env.ZOHO_RESPONSE_TYPE || 'code';
  const accessType = process.env.ZOHO_ACCESS_TYPE || 'offline';
  const prompt = process.env.ZOHO_PROMPT || 'consent';
  const state = process.env.ZOHO_STATE || req.query.state || 'default-state';
  const zohoAuthUrl = process.env.ZOHO_AUTH_URL || 'https://accounts.zoho.in/oauth/v2/auth';
  const zohoTokenUrl = process.env.ZOHO_TOKEN_URL || 'https://accounts.zoho.in/oauth/v2/token';
  
  // URL encode the parameters (equivalent to Java's URLEncoder.encode)
  const encodedClientId = encodeURIComponent(clientId);
  const encodedRedirectUrl = encodeURIComponent(redirectUrl);
  const encodedScope = encodeURIComponent(scope);
  const encodedState = encodeURIComponent(state);
  
  // Build the auth URL with all parameters
  const authUrl = zohoAuthUrl
    + '?response_type=' + responseType
    + '&client_id=' + encodedClientId
    + '&scope=' + encodedScope
    + '&redirect_uri=' + encodedRedirectUrl
    + '&access_type=' + accessType
    + '&prompt=' + prompt
    + '&state=' + encodedState;
  
  console.log('Generated auth URL:', authUrl);
  console.log('OAuth Configuration:');
  console.log('  Client ID:', clientId);
  console.log('  Client Secret:', clientSecret ? '[SET]' : '[NOT SET]');
  console.log('  Redirect URL:', redirectUrl);
  console.log('  Scope:', scope);
  console.log('  Response Type:', responseType);
  console.log('  Access Type:', accessType);
  console.log('  Prompt:', prompt);
  console.log('  State:', state);
  console.log('  Auth URL:', zohoAuthUrl);
  console.log('  Token URL:', zohoTokenUrl);
  
  // Set 302 redirect status and Location header (equivalent to your Java code)
  res.status(302);
  res.setHeader('Location', authUrl);
  res.end();
});
//--------------------------------getCode--------------------------------
app.get('/getCode', (req, res) => {
  const { code } = req.query;
  
  console.log('=== /getCode API Called ===');
  console.log('Received code parameter:', code);
  console.log('Full query parameters:', req.query);
  console.log('Request headers:', req.headers);
  
  if (!code) {
    console.log('ERROR: No authorization code received');
    return res.status(400).json({
      error: 'Authorization code is required',
      message: 'No authorization code received from Zoho'
    });
  }
  
  console.log('✅ Authorization code received successfully:', code);

  // Get OAuth parameters from environment variables
  const clientId = process.env.ZOHO_CLIENT_ID || '1000.9OLXK925B3ZYBG3SXCSQSX5WYS251A';
  const clientSecret = process.env.ZOHO_CLIENT_SECRET || '112e208ce2abddeac835b26d228580362477ba9653';
  const redirectUrl = process.env.ZOHO_REDIRECT_URL || `${APP_BASE_URL}/getCode`;
  const grantType = process.env.ZOHO_GRANT_TYPE || 'authorization_code';
  const zohoTokenUrl = process.env.ZOHO_TOKEN_URL || 'https://accounts.zoho.in/oauth/v2/token';
  const cookieHeader = process.env.ZOHO_COOKIE_HEADER || 'iamcsr=57700fb3-ff9f-4fac-8c09-656eb8a2576b; zalb_6e73717622=680d8e643c8d4f4ecb79bf7c0a6012e8';

  const options = {
    'method': 'POST',
    'url': zohoTokenUrl,
    'headers': {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookieHeader
    },
    form: {
      'client_id': clientId,
      'client_secret': clientSecret,
      'grant_type': grantType,
      'redirect_uri': redirectUrl,
      'code': code
    }
  };

  request(options, function (error, response) {
    if (error) {
      console.error('Error making token request:', error);
      return res.status(500).json({
        error: 'Failed to exchange authorization code for token',
        details: error.message
      });
    }
    
    console.log('Token response:', response.body);
    
    try {
      const tokenData = JSON.parse(response.body);
      
      // Decode and console the JWT id_token if it exists
      if (tokenData.id_token) {
        console.log('\n=== JWT ID TOKEN DECODED ===');
        try {
          // Decode the JWT without verification (since we don't have the public key)
          const decodedToken = jwt.decode(tokenData.id_token, { complete: true });
          
          console.log('JWT Header:', JSON.stringify(decodedToken.header, null, 2));
          console.log('JWT Payload:', JSON.stringify(decodedToken.payload, null, 2));
          
          // Extract user information from the payload
          if (decodedToken.payload) {
            console.log('\n=== USER INFORMATION ===');
            console.log('User ID (sub):', decodedToken.payload.sub);
            console.log('Email:', decodedToken.payload.email);
            console.log('Email Verified:', decodedToken.payload.email_verified);
            console.log('Issuer:', decodedToken.payload.iss);
            console.log('Audience:', decodedToken.payload.aud);
            console.log('Issued At:', new Date(decodedToken.payload.iat * 1000).toISOString());
            console.log('Expires At:', new Date(decodedToken.payload.exp * 1000).toISOString());
            console.log('Token Type:', decodedToken.payload.token_type || 'JWT');
          }
        } catch (jwtError) {
          console.error('Error decoding JWT:', jwtError.message);
        }
        console.log('=== END JWT DECODE ===\n');
      }
      
          // Extract user information from JWT for redirect and database storage
      let userEmail = null;
      let userName = null;
      let userUniqueId = null;
      
      if (tokenData.id_token) {
        try {
          const decodedToken = jwt.decode(tokenData.id_token, { complete: true });
          if (decodedToken.payload) {
            userEmail = decodedToken.payload.email;
            userUniqueId = decodedToken.payload.sub; // This is the unique ID from JWT
            userName = decodedToken.payload.name || decodedToken.payload.first_name || 
                      (userEmail ? userEmail.split('@')[0] : null);
            
            // Allowlist check (env ALLOWED_EMAILS as comma-separated list)
            const allowedList = (process.env.ALLOWED_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
            const isAllowed = allowedList.length === 0 ? false : allowedList.includes((userEmail || '').toLowerCase());

            if (!isAllowed) {
              // superadmin override based on email
              const superAdmins = ['miraculine.j@zohocorp.com', 'rajendran@zohocorp.com'];
              const isSuperAdmin = superAdmins.includes((userEmail || '').toLowerCase());
              if (isSuperAdmin) {
                console.log('👑 Superadmin override allowed for', userEmail);
              } else {
              console.warn('❌ Access denied for user:', userEmail);
              const denyUrl = new URL(`${APP_BASE_URL}/access-denied.html`);
              denyUrl.searchParams.set('email', userEmail || 'unknown');
              return res.redirect(denyUrl.toString());
              }
            }

            // Store user in database
            if (userEmail && userUniqueId) {
              const role = ['miraculine.j@zohocorp.com','rajendran@zohocorp.com'].includes(userEmail.toLowerCase()) ? 'superadmin' : undefined;
              console.log('💾 Storing user in database...');
              const dbResult = upsertUser(userUniqueId, userEmail, role);
              console.log('Database result:', dbResult);
            }
          }
        } catch (jwtError) {
          console.error('Error extracting user info from JWT:', jwtError.message);
        }
      }
      
      // Redirect back to landing page with user information
      const redirectUrl = new URL(`${APP_BASE_URL}/`);
      if (userEmail) redirectUrl.searchParams.set('email', userEmail);
      if (userName) redirectUrl.searchParams.set('name', userName);
      
      console.log('Redirecting user back to landing page with info:', { userEmail, userName });
      res.redirect(redirectUrl.toString());
    } catch (parseError) {
      console.error('Error parsing token response:', parseError);
      // Even if parsing fails, try to redirect back to landing page
      res.redirect(`${APP_BASE_URL}/?login=success`);
    }
  });
});

// Database API endpoints
app.get('/api/users', (req, res) => {
  try {
    const users = getAllUsers();
    const userCount = getUserCount();
    
    res.json({
      success: true,
      count: userCount,
      users: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      message: error.message
    });
  }
});

app.get('/api/users/count', (req, res) => {
  try {
    const userCount = getUserCount();
    
    res.json({
      success: true,
      count: userCount
    });
  } catch (error) {
    console.error('Error fetching user count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user count',
      message: error.message
    });
  }
});

app.get('/api/users/:uniqueId', (req, res) => {
  try {
    const { uniqueId } = req.params;
    const user = getUserByUniqueId(uniqueId);
    
    if (user) {
      res.json({
        success: true,
        user: user
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'User not found',
        uniqueId: uniqueId
      });
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
      message: error.message
    });
  }
});

// Student API endpoints
app.get('/api/students', (req, res) => {
  try {
    const students = getAllStudents();
    const studentCount = getStudentCount();
    
    res.json({
      success: true,
      count: studentCount,
      students: students
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch students',
      message: error.message
    });
  }
});

app.get('/api/students/count', (req, res) => {
  try {
    const studentCount = getStudentCount();
    
    res.json({
      success: true,
      count: studentCount
    });
  } catch (error) {
    console.error('Error fetching student count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch student count',
      message: error.message
    });
  }
});

app.get('/api/students/email/:email', (req, res) => {
  try {
    const { email } = req.params;
    const student = getStudentByEmail(email);
    
    if (student) {
      res.json({
        success: true,
        student: student
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Student not found',
        email: email
      });
    }
  } catch (error) {
    console.error('Error fetching student by email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch student',
      message: error.message
    });
  }
});

app.get('/api/students/zeta/:zetaId', (req, res) => {
  try {
    const { zetaId } = req.params;
    const student = getStudentByZetaId(zetaId);
    
    if (student) {
      res.json({
        success: true,
        student: student
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Student not found',
        zetaId: zetaId
      });
    }
  } catch (error) {
    console.error('Error fetching student by zeta ID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch student',
      message: error.message
    });
  }
});

app.post('/api/students', (req, res) => {
  try {
    const { name, phone, first_name, last_name, email, address, zeta_id } = req.body;
    
    // Validate required fields
    if (!name || !first_name || !last_name || !email || !zeta_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['name', 'first_name', 'last_name', 'email', 'zeta_id']
      });
    }
    
    const result = upsertStudent(name, phone, first_name, last_name, email, address, zeta_id);
    
    if (result.success) {
      res.status(201).json({
        success: true,
        message: `Student ${result.action} successfully`,
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to save student',
        details: result
      });
    }
  } catch (error) {
    console.error('Error creating/updating student:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save student',
      message: error.message
    });
  }
});

app.delete('/api/students/email/:email', (req, res) => {
  try {
    const { email } = req.params;
    const result = deleteStudentByEmail(email);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Student deleted successfully',
        data: result
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Student not found or deletion failed',
        details: result
      });
    }
  } catch (error) {
    console.error('Error deleting student by email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete student',
      message: error.message
    });
  }
});

app.delete('/api/students/zeta/:zetaId', (req, res) => {
  try {
    const { zetaId } = req.params;
    const result = deleteStudentByZetaId(zetaId);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Student deleted successfully',
        data: result
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Student not found or deletion failed',
        details: result
      });
    }
  } catch (error) {
    console.error('Error deleting student by zeta ID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete student',
      message: error.message
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 App Base URL: ${APP_BASE_URL}`);
  console.log(`👥 Users API: http://localhost:${PORT}/api/users`);
  console.log(`📊 User count: http://localhost:${PORT}/api/users/count`);
  console.log(`🎓 Students API: http://localhost:${PORT}/api/students`);
  console.log(`📊 Student count: http://localhost:${PORT}/api/students/count`);
  console.log('\n📋 Environment Configuration:');
  console.log(`  ZOHO_CLIENT_ID: ${process.env.ZOHO_CLIENT_ID ? '[SET]' : '[NOT SET]'}`);
  console.log(`  ZOHO_CLIENT_SECRET: ${process.env.ZOHO_CLIENT_SECRET ? '[SET]' : '[NOT SET]'}`);
  console.log(`  ZOHO_REDIRECT_URL: ${process.env.ZOHO_REDIRECT_URL || `${APP_BASE_URL}/getCode`}`);
  console.log(`  ZOHO_SCOPE: ${process.env.ZOHO_SCOPE || '[DEFAULT]'}`);
  console.log(`  ZOHO_AUTH_URL: ${process.env.ZOHO_AUTH_URL || '[DEFAULT]'}`);
  console.log(`  ZOHO_TOKEN_URL: ${process.env.ZOHO_TOKEN_URL || '[DEFAULT]'}`);
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log('\n📊 Database Status:');
  console.log(`  Database: bees.db`);
  console.log(`  Users table: Ready`);
  console.log(`  Students table: Ready`);
  console.log(`  Current users: ${getUserCount()}`);
  console.log(`  Current students: ${getStudentCount()}`);
});

module.exports = app;
