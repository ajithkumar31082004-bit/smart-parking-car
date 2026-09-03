/**
 * Universal Database Adapter for SmartPark AI
 * Supports both AWS RDS MySQL (Production) and SQLite (Local / Dev)
 */

const path = require('path');
const fs = require('fs');

const DB_CLIENT = process.env.DB_CLIENT || (process.env.DB_HOST || process.env.DATABASE_HOST ? 'mysql' : 'sqlite');
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'smartpark.db');

let db = null;
let mysqlPool = null;

if (DB_CLIENT === 'mysql') {
    const mysql = require('mysql2/promise');
    
    const dbConfig = {
        host: process.env.DB_HOST || process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || process.env.DATABASE_USER || 'admin',
        password: process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD || '',
        database: process.env.DB_NAME || process.env.DATABASE_NAME || 'smartpark',
        waitForConnections: true,
        connectionLimit: 15,
        queueLimit: 0,
        multipleStatements: true
    };

    console.log(`[DB] Initializing MySQL connection pool for AWS RDS (${dbConfig.host}:${dbConfig.port}/${dbConfig.database})...`);
    mysqlPool = mysql.createPool(dbConfig);
    db = mysqlPool;
} else {
    const sqlite3 = require('sqlite3').verbose();
    db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error('[DB] Failed to connect to SQLite database:', err.message);
        } else {
            console.log('[DB] Connected to SQLite database at', DB_PATH);
        }
    });

    // Enable WAL mode & foreign keys for SQLite
    db.serialize(() => {
        db.run('PRAGMA foreign_keys = ON;');
        db.run('PRAGMA journal_mode = WAL;');
    });
}

// Helper promises wrapper for clean async/await across SQLite and MySQL
const query = async (sql, params = []) => {
    if (DB_CLIENT === 'mysql') {
        const [rows] = await mysqlPool.execute(sql, params);
        return rows;
    }
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
};

const get = async (sql, params = []) => {
    if (DB_CLIENT === 'mysql') {
        const [rows] = await mysqlPool.execute(sql, params);
        return rows && rows.length > 0 ? rows[0] : null;
    }
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
};

const run = async (sql, params = []) => {
    if (DB_CLIENT === 'mysql') {
        const [result] = await mysqlPool.execute(sql, params);
        return { lastID: result.insertId, changes: result.affectedRows };
    }
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};

const exec = async (sql) => {
    if (DB_CLIENT === 'mysql') {
        const [result] = await mysqlPool.query(sql);
        return result;
    }
    return new Promise((resolve, reject) => {
        db.exec(sql, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
};

module.exports = {
    db,
    query,
    get,
    run,
    exec,
    DB_CLIENT,
    DB_PATH
};
