const Database = require('better-sqlite3');
const path = require('path');

// Create database connection (configurable path)
const dbPath = process.env.DB_PATH || path.join(__dirname, 'bees.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create users table if it doesn't exist
const createUsersTable = () => {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unique_id TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  db.exec(createTableSQL);

  // Ensure role column exists (for older installations)
  try {
    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    const hasRole = tableInfo.some(col => col.name === 'role');
    if (!hasRole) {
      db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
      console.log('🛠️ Added missing role column to users table');
    }
  } catch (e) {
    // Best-effort; log and continue
    console.warn('⚠️ Could not verify/add role column:', e.message);
  }

  console.log('✅ Users table created/verified successfully');
};

// Create students table if it doesn't exist
const createStudentsTable = () => {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      address TEXT,
      zeta_id TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  db.exec(createTableSQL);
  console.log('✅ Students table created/verified successfully');
};

// Seed super admin users
const seedSuperAdmins = () => {
  const superAdmins = [
    { email: 'miraculine.j@zohocorp.com', uniqueId: 'superadmin:miraculine.j@zohocorp.com' },
    { email: 'rajendran@zohocorp.com', uniqueId: 'superadmin:rajendran@zohocorp.com' }
  ];

  const upsertRoleSQL = `
    INSERT INTO users (unique_id, email, role, created_at, updated_at)
    VALUES (?, ?, 'superadmin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(unique_id) DO UPDATE SET 
      email = excluded.email,
      role = 'superadmin',
      updated_at = CURRENT_TIMESTAMP
  `;
  const stmt = db.prepare(upsertRoleSQL);
  for (const admin of superAdmins) {
    try {
      stmt.run(admin.uniqueId, admin.email);
    } catch (e) {
      console.warn('⚠️ Failed seeding superadmin', admin.email, e.message);
    }
  }
  console.log('👑 Superadmins seeded/verified');
};

// Initialize database
const initDatabase = () => {
  try {
    createUsersTable();
    seedSuperAdmins();
    createStudentsTable();
    console.log('📊 Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
};

// Insert or update user (optionally role)
const upsertUser = (uniqueId, email, role) => {
  try {
    // First, try to insert the user
    const insertSQL = `
      INSERT INTO users (unique_id, email, role, created_at, updated_at)
      VALUES (?, ?, COALESCE(?, 'user'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    
    const insertStmt = db.prepare(insertSQL);
    insertStmt.run(uniqueId, email, role);
    
    console.log(`✅ New user inserted: ${email} (ID: ${uniqueId}) role=${role || 'user'}`);
    return { success: true, action: 'inserted', uniqueId, email, role: role || 'user' };
    
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      // User already exists, update the email and timestamp
      const updateSQL = `
        UPDATE users 
        SET email = ?, 
            role = COALESCE(?, role),
            updated_at = CURRENT_TIMESTAMP 
        WHERE unique_id = ?
      `;
      
      const updateStmt = db.prepare(updateSQL);
      const result = updateStmt.run(email, role || null, uniqueId);
      
      if (result.changes > 0) {
        console.log(`✅ User updated: ${email} (ID: ${uniqueId}) role=${role || '[unchanged]'}`);
        return { success: true, action: 'updated', uniqueId, email, role: role || null };
      } else {
        console.log(`ℹ️ User not found for update: ${uniqueId}`);
        return { success: false, action: 'not_found', uniqueId, email };
      }
    } else {
      console.error('❌ Database error:', error);
      return { success: false, action: 'error', uniqueId, email, error: error.message };
    }
  }
};

// Get user by unique ID
const getUserByUniqueId = (uniqueId) => {
  try {
    const selectSQL = 'SELECT * FROM users WHERE unique_id = ?';
    const selectStmt = db.prepare(selectSQL);
    const user = selectStmt.get(uniqueId);
    
    return user || null;
  } catch (error) {
    console.error('❌ Error getting user:', error);
    return null;
  }
};

// Get user by email
const getUserByEmail = (email) => {
  try {
    const selectSQL = 'SELECT * FROM users WHERE email = ?';
    const selectStmt = db.prepare(selectSQL);
    const user = selectStmt.get(email);
    return user || null;
  } catch (error) {
    console.error('❌ Error getting user by email:', error);
    return null;
  }
};

// Set user role
const setUserRole = (email, role) => {
  try {
    const updateSQL = `UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?`;
    const stmt = db.prepare(updateSQL);
    const result = stmt.run(role, email);
    return result.changes > 0;
  } catch (error) {
    console.error('❌ Error setting user role:', error);
    return false;
  }
};

// Get all users
const getAllUsers = () => {
  try {
    const selectSQL = 'SELECT * FROM users ORDER BY created_at DESC';
    const selectStmt = db.prepare(selectSQL);
    const users = selectStmt.all();
    
    return users;
  } catch (error) {
    console.error('❌ Error getting all users:', error);
    return [];
  }
};

// Get user count
const getUserCount = () => {
  try {
    const countSQL = 'SELECT COUNT(*) as count FROM users';
    const countStmt = db.prepare(countSQL);
    const result = countStmt.get();
    
    return result.count;
  } catch (error) {
    console.error('❌ Error getting user count:', error);
    return 0;
  }
};

// Student management functions

// Insert or update student
const upsertStudent = (name, phone, firstName, lastName, email, address, zetaId) => {
  try {
    // First, try to insert the student
    const insertSQL = `
      INSERT INTO students (name, phone, first_name, last_name, email, address, zeta_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    
    const insertStmt = db.prepare(insertSQL);
    insertStmt.run(name, phone, firstName, lastName, email, address, zetaId);
    
    console.log(`✅ New student inserted: ${email} (Zeta ID: ${zetaId})`);
    return { success: true, action: 'inserted', email, zetaId };
    
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      // Student already exists, update the information
      const updateSQL = `
        UPDATE students 
        SET name = ?, phone = ?, first_name = ?, last_name = ?, email = ?, address = ?, zeta_id = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE email = ? OR zeta_id = ?
      `;
      
      const updateStmt = db.prepare(updateSQL);
      const result = updateStmt.run(name, phone, firstName, lastName, email, address, zetaId, email, zetaId);
      
      if (result.changes > 0) {
        console.log(`✅ Student updated: ${email} (Zeta ID: ${zetaId})`);
        return { success: true, action: 'updated', email, zetaId };
      } else {
        console.log(`ℹ️ Student not found for update: ${email} or ${zetaId}`);
        return { success: false, action: 'not_found', email, zetaId };
      }
    } else {
      console.error('❌ Database error:', error);
      return { success: false, action: 'error', email, zetaId, error: error.message };
    }
  }
};

// Get student by email
const getStudentByEmail = (email) => {
  try {
    const selectSQL = 'SELECT * FROM students WHERE email = ?';
    const selectStmt = db.prepare(selectSQL);
    const student = selectStmt.get(email);
    
    return student || null;
  } catch (error) {
    console.error('❌ Error getting student by email:', error);
    return null;
  }
};

// Get student by zeta ID
const getStudentByZetaId = (zetaId) => {
  try {
    const selectSQL = 'SELECT * FROM students WHERE zeta_id = ?';
    const selectStmt = db.prepare(selectSQL);
    const student = selectStmt.get(zetaId);
    
    return student || null;
  } catch (error) {
    console.error('❌ Error getting student by zeta ID:', error);
    return null;
  }
};

// Get all students
const getAllStudents = () => {
  try {
    const selectSQL = 'SELECT * FROM students ORDER BY created_at DESC';
    const selectStmt = db.prepare(selectSQL);
    const students = selectStmt.all();
    
    return students;
  } catch (error) {
    console.error('❌ Error getting all students:', error);
    return [];
  }
};

// Get student count
const getStudentCount = () => {
  try {
    const countSQL = 'SELECT COUNT(*) as count FROM students';
    const countStmt = db.prepare(countSQL);
    const result = countStmt.get();
    
    return result.count;
  } catch (error) {
    console.error('❌ Error getting student count:', error);
    return 0;
  }
};

// Delete student by email
const deleteStudentByEmail = (email) => {
  try {
    const deleteSQL = 'DELETE FROM students WHERE email = ?';
    const deleteStmt = db.prepare(deleteSQL);
    const result = deleteStmt.run(email);
    
    if (result.changes > 0) {
      console.log(`✅ Student deleted: ${email}`);
      return { success: true, action: 'deleted', email };
    } else {
      console.log(`ℹ️ Student not found for deletion: ${email}`);
      return { success: false, action: 'not_found', email };
    }
  } catch (error) {
    console.error('❌ Error deleting student:', error);
    return { success: false, action: 'error', email, error: error.message };
  }
};

// Delete student by zeta ID
const deleteStudentByZetaId = (zetaId) => {
  try {
    const deleteSQL = 'DELETE FROM students WHERE zeta_id = ?';
    const deleteStmt = db.prepare(deleteSQL);
    const result = deleteStmt.run(zetaId);
    
    if (result.changes > 0) {
      console.log(`✅ Student deleted: Zeta ID ${zetaId}`);
      return { success: true, action: 'deleted', zetaId };
    } else {
      console.log(`ℹ️ Student not found for deletion: Zeta ID ${zetaId}`);
      return { success: false, action: 'not_found', zetaId };
    }
  } catch (error) {
    console.error('❌ Error deleting student:', error);
    return { success: false, action: 'error', zetaId, error: error.message };
  }
};

// Close database connection
const closeDatabase = () => {
  try {
    db.close();
    console.log('📊 Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database:', error);
  }
};

// Initialize database on module load
initDatabase();

module.exports = {
  db,
  upsertUser,
  getUserByUniqueId,
  getUserByEmail,
  getAllUsers,
  getUserCount,
  setUserRole,
  seedSuperAdmins,
  upsertStudent,
  getStudentByEmail,
  getStudentByZetaId,
  getAllStudents,
  getStudentCount,
  deleteStudentByEmail,
  deleteStudentByZetaId,
  closeDatabase
};
