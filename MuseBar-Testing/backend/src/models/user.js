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
exports.UserModel = void 0;
const app_1 = require("../app");
const bcrypt_1 = __importDefault(require("bcrypt"));
class UserModel {
    static createUser(email_1, password_1) {
        return __awaiter(this, arguments, void 0, function* (email, password, is_admin = false) {
            const password_hash = yield bcrypt_1.default.hash(password, 12);
            const result = yield app_1.pool.query(`INSERT INTO users (email, password_hash, is_admin) VALUES ($1, $2, $3) RETURNING *`, [email, password_hash, is_admin]);
            return result.rows[0];
        });
    }
    static findByEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield app_1.pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
            return result.rows[0] || null;
        });
    }
    static findById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield app_1.pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
            return result.rows[0] || null;
        });
    }
    static verifyPassword(user, password) {
        return __awaiter(this, void 0, void 0, function* () {
            return bcrypt_1.default.compare(password, user.password_hash);
        });
    }
    // Permission management
    static getUserPermissions(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield app_1.pool.query(`SELECT p.name FROM permissions p
       JOIN user_permissions up ON up.permission_id = p.id
       WHERE up.user_id = $1`, [userId]);
            return result.rows.map((row) => row.name);
        });
    }
    static setUserPermissions(userId, permissions) {
        return __awaiter(this, void 0, void 0, function* () {
            // Remove all current permissions
            yield app_1.pool.query('DELETE FROM user_permissions WHERE user_id = $1', [userId]);
            // Add new permissions
            for (const perm of permissions) {
                const permRes = yield app_1.pool.query('SELECT id FROM permissions WHERE name = $1', [perm]);
                if (permRes.rows.length > 0) {
                    yield app_1.pool.query('INSERT INTO user_permissions (user_id, permission_id) VALUES ($1, $2)', [userId, permRes.rows[0].id]);
                }
            }
        });
    }
}
exports.UserModel = UserModel;
