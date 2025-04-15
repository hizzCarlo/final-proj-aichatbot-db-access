import Database from 'better-sqlite3';
import { DB_PATH } from '$env/static/private';

// Initialize database connection
const db = new Database(DB_PATH, { verbose: console.log });

// Enable foreign keys
db.pragma('foreign_keys = ON');

export default db; 