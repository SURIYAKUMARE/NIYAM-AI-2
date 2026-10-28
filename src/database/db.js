const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const DB_PATH = path.join(__dirname, 'aicte_approval.db');

class DatabaseConnection {
    constructor() {
        this.db = null;
        this.inTransaction = false;
        this.init();
    }

    init() {
        if (!this.db) {
            this.db = new DatabaseSync(DB_PATH);
            // Enable WAL mode, foreign keys, and busy timeout
            this.db.exec('PRAGMA journal_mode = WAL;');
            this.db.exec('PRAGMA foreign_keys = ON;');
            this.db.exec('PRAGMA busy_timeout = 10000;');
            this.applySchema();
        }
    }

    applySchema() {
        const schemaPath = path.join(__dirname, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');
            this.db.exec(schemaSql);
        }
    }

    query(sql, params = []) {
        try {
            const stmt = this.db.prepare(sql);
            return stmt.all(...params);
        } catch (err) {
            console.error(`[DB Query Error] ${err.message} in SQL: ${sql}`);
            throw err;
        }
    }

    queryOne(sql, params = []) {
        try {
            const stmt = this.db.prepare(sql);
            return stmt.get(...params) || null;
        } catch (err) {
            console.error(`[DB QueryOne Error] ${err.message} in SQL: ${sql}`);
            throw err;
        }
    }

    execute(sql, params = []) {
        try {
            const stmt = this.db.prepare(sql);
            return stmt.run(...params);
        } catch (err) {
            console.error(`[DB Execute Error] ${err.message} in SQL: ${sql}`);
            throw err;
        }
    }

    transaction(callback) {
        if (this.inTransaction) {
            return callback(this);
        }
        this.inTransaction = true;
        this.db.exec('BEGIN TRANSACTION;');
        try {
            const result = callback(this);
            this.db.exec('COMMIT;');
            return result;
        } catch (err) {
            this.db.exec('ROLLBACK;');
            throw err;
        } finally {
            this.inTransaction = false;
        }
    }
}

const dbInstance = new DatabaseConnection();

module.exports = dbInstance;
