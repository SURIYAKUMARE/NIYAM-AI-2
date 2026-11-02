const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const ORIG_DB_PATH = path.join(__dirname, 'aicte_approval.db');
let DB_PATH = ORIG_DB_PATH;

if (process.env.VERCEL) {
    try {
        const tmpDb = path.join('/tmp', 'aicte_approval.db');
        if (!fs.existsSync(tmpDb) && fs.existsSync(ORIG_DB_PATH)) {
            fs.copyFileSync(ORIG_DB_PATH, tmpDb);
        }
        if (fs.existsSync(tmpDb)) {
            DB_PATH = tmpDb;
        }
    } catch (e) {
        console.warn('[DB] Failed to use /tmp DB, using original path:', e.message);
    }
}

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

        // Safe column additions for existing persistent databases
        const safeAddCol = (table, colDef) => {
            try {
                this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${colDef};`);
            } catch (e) {
                // Ignore if column already exists
            }
        };

        safeAddCol('deficiencies', 'response_due_date DATE');
        safeAddCol('documents', 'issuing_authority TEXT');
        safeAddCol('documents', 'registration_number TEXT');
        safeAddCol('documents', 'version_number INTEGER DEFAULT 1');
        safeAddCol('documents', 'statutory_category TEXT');
        safeAddCol('applications', 'decision_reason TEXT');
        safeAddCol('applications', 'official_outcome TEXT');
        safeAddCol('applications', 'order_number TEXT');
        safeAddCol('applications', 'college_delay_seconds INTEGER DEFAULT 0');
        safeAddCol('applications', 'officer_processing_seconds INTEGER DEFAULT 0');
        safeAddCol('applications', 'active_clock TEXT DEFAULT "OFFICER_PROCESSING"');
        safeAddCol('applications', 'last_clock_switch_at TIMESTAMP');
        safeAddCol('applications', 'current_escalation_level INTEGER DEFAULT 1');
        safeAddCol('applications', 'detailed_stage_index INTEGER DEFAULT 1');
        safeAddCol('applications', 'detailed_stage_name TEXT DEFAULT "APPLICATION_SUBMISSION"');
        safeAddCol('applications', 'aph_version TEXT DEFAULT "APH-2025-26"');
        safeAddCol('escalation_events', 'escalation_level INTEGER DEFAULT 1');
        safeAddCol('escalation_events', 'administrative_override INTEGER DEFAULT 0');
        safeAddCol('escalation_events', 'override_justification TEXT');
        safeAddCol('escalation_events', 'override_actor_id TEXT');

        // Ensure simulation clock singleton exists
        try {
            this.db.exec(`
                INSERT OR IGNORE INTO simulation_clock (id, is_simulation_active, virtual_time_offset_seconds, simulated_timestamp, notes)
                VALUES (1, 0, 0, CURRENT_TIMESTAMP, 'Real-time production baseline');
            `);
        } catch (_) {}

        // Ensure retention_policies table and seed defaults
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS retention_policies (
                id TEXT PRIMARY KEY,
                policy_name TEXT NOT NULL,
                entity_name TEXT NOT NULL UNIQUE,
                retention_period_years INTEGER NOT NULL,
                archive_storage_tier TEXT NOT NULL,
                auto_purge_enabled INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            INSERT OR IGNORE INTO retention_policies (id, policy_name, entity_name, retention_period_years, archive_storage_tier, auto_purge_enabled, is_active)
            VALUES 
                ('RET_POL_001', 'Cryptographic Audit Trail Retention', 'audit_events', 10, 'IMMUTABLE_WORM_COLD', 0, 1),
                ('RET_POL_002', 'Statutory Approval Dossier Retention', 'applications', 15, 'PERMANENT_LEGAL_ARCHIVE', 0, 1),
                ('RET_POL_003', 'Statutory Deeds & Leases Retention', 'documents', 7, 'SECURE_DOCUMENT_VAULT', 0, 1),
                ('RET_POL_004', 'System Notifications & Operational Alerts', 'notifications', 1, 'ROTATING_OPERATIONAL', 1, 1);
        `);
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
