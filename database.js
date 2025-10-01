const Database = require('better-sqlite3');
const path = require('path');

// Create database connection
const dbPath = path.join(__dirname, 'bees.db');
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  db.exec(createTableSQL);
  console.log('✅ Users table created/verified successfully');
};

// Initialize database
const initDatabase = () => {
  try {
    createUsersTable();
    console.log('📊 Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
};

// Insert or update user
const upsertUser = (uniqueId, email) => {
  try {
    // First, try to insert the user
    const insertSQL = `
      INSERT INTO users (unique_id, email, created_at, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    
    const insertStmt = db.prepare(insertSQL);
    insertStmt.run(uniqueId, email);
    
    console.log(`✅ New user inserted: ${email} (ID: ${uniqueId})`);
    return { success: true, action: 'inserted', uniqueId, email };
    
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      // User already exists, update the email and timestamp
      const updateSQL = `
        UPDATE users 
        SET email = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE unique_id = ?
      `;
      
      const updateStmt = db.prepare(updateSQL);
      const result = updateStmt.run(email, uniqueId);
      
      if (result.changes > 0) {
        console.log(`✅ User updated: ${email} (ID: ${uniqueId})`);
        return { success: true, action: 'updated', uniqueId, email };
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
  getAllUsers,
  getUserCount,
  closeDatabase
};
