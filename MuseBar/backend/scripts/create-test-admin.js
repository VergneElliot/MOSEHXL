"use strict";
/**
 * Create Test Admin User Script
 * Creates a test admin user with known credentials for testing
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
const pg_1 = require("pg");
function createTestAdmin() {
    return __awaiter(this, void 0, void 0, function* () {
        const pool = new pg_1.Pool({
            host: 'localhost',
            port: 5432,
            database: 'mosehxl_development',
            user: 'postgres',
            password: 'postgres'
        });
        try {
            const client = yield pool.connect();
            // Check if test admin already exists
            const existingUser = yield client.query('SELECT id FROM users WHERE email = $1', ['testadmin@mosehxl.com']);
            if (existingUser.rows.length > 0) {
                console.log('✅ Test admin user already exists');
                return;
            }
            // Create test admin user
            const password = 'testadmin123';
            const passwordHash = yield bcrypt_1.default.hash(password, 12);
            const result = yield client.query(`INSERT INTO users (email, password_hash, role, first_name, last_name, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, email, role`, [
                'testadmin@mosehxl.com',
                passwordHash,
                'system_admin',
                'Test',
                'Admin',
                true
            ]);
            console.log('✅ Test admin user created successfully:');
            console.log(`   ID: ${result.rows[0].id}`);
            console.log(`   Email: ${result.rows[0].email}`);
            console.log(`   Role: ${result.rows[0].role}`);
            console.log(`   Password: ${password}`);
            client.release();
        }
        catch (error) {
            console.error('❌ Error creating test admin:', error);
        }
        finally {
            yield pool.end();
        }
    });
}
createTestAdmin();
