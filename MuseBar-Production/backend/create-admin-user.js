"use strict";
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
const pg_1 = require("pg");
const bcrypt_1 = __importDefault(require("bcrypt"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const email = 'elliot.vergne@gmail.com';
const password = 'Vergemolle22@';
const isAdmin = true;
const pool = new pg_1.Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'musebar',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432'),
});
function createAdminUser() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const hash = yield bcrypt_1.default.hash(password, 12);
            // Insert user if not exists
            const userRes = yield pool.query(`INSERT INTO users (email, password_hash, is_admin)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET is_admin = EXCLUDED.is_admin
       RETURNING id`, [email, hash, isAdmin]);
            const userId = userRes.rows[0].id;
            console.log(`Admin user created/updated with id: ${userId}`);
            // Grant all permissions
            const permRes = yield pool.query('SELECT id FROM permissions');
            for (const row of permRes.rows) {
                yield pool.query('INSERT INTO user_permissions (user_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, row.id]);
            }
            console.log('All permissions granted to admin user.');
        }
        catch (err) {
            console.error('Error creating admin user:', err);
        }
        finally {
            yield pool.end();
        }
    });
}
createAdminUser();
