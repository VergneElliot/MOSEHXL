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
exports.LegalJournalModel = void 0;
const crypto_1 = __importDefault(require("crypto"));
const app_1 = require("../app");
class LegalJournalModel {
    // Generate cryptographic hash for transaction integrity
    static generateHash(data, previousHash) {
        const content = `${previousHash}|${data}`;
        return crypto_1.default.createHash('sha256').update(content).digest('hex');
    }
    // Get the last journal entry to maintain hash chain
    static getLastEntry() {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT * FROM legal_journal 
      ORDER BY sequence_number DESC 
      LIMIT 1
    `;
            const result = yield app_1.pool.query(query);
            return result.rows[0] || null;
        });
    }
    // Add entry to the append-only legal journal
    static addEntry(transactionType, orderId, amount, vatAmount, paymentMethod, transactionData, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get last entry for hash chain
            const lastEntry = yield this.getLastEntry();
            const sequenceNumber = ((lastEntry === null || lastEntry === void 0 ? void 0 : lastEntry.sequence_number) || 0) + 1;
            const previousHash = (lastEntry === null || lastEntry === void 0 ? void 0 : lastEntry.current_hash) || '0000000000000000000000000000000000000000000000000000000000000000';
            // Create data string for hashing
            const dataString = `${sequenceNumber}|${transactionType}|${orderId}|${amount}|${vatAmount}|${paymentMethod}|${new Date().toISOString()}|${this.registerKey}`;
            const currentHash = this.generateHash(dataString, previousHash);
            const query = `
      INSERT INTO legal_journal (
        sequence_number, transaction_type, order_id, amount, vat_amount, 
        payment_method, transaction_data, previous_hash, current_hash,
        timestamp, user_id, register_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
            const values = [
                sequenceNumber,
                transactionType,
                orderId,
                amount,
                vatAmount,
                paymentMethod,
                JSON.stringify(transactionData),
                previousHash,
                currentHash,
                new Date(),
                userId,
                this.registerKey
            ];
            const result = yield app_1.pool.query(query, values);
            return result.rows[0];
        });
    }
    // Verify journal integrity by checking hash chain
    static verifyJournalIntegrity() {
        return __awaiter(this, void 0, void 0, function* () {
            const errors = [];
            const query = `
      SELECT * FROM legal_journal 
      ORDER BY sequence_number ASC
    `;
            const result = yield app_1.pool.query(query);
            const entries = result.rows;
            if (entries.length === 0) {
                return { isValid: true, errors: [] };
            }
            let expectedPreviousHash = '0000000000000000000000000000000000000000000000000000000000000000';
            for (let i = 0; i < entries.length; i++) {
                const entry = entries[i];
                // Check sequence number continuity
                if (entry.sequence_number !== i + 1) {
                    errors.push(`Sequence break at entry ${entry.sequence_number}: expected ${i + 1}`);
                }
                // Check previous hash
                if (entry.previous_hash !== expectedPreviousHash) {
                    errors.push(`Hash chain broken at sequence ${entry.sequence_number}: expected previous hash ${expectedPreviousHash}, got ${entry.previous_hash}`);
                }
                // Verify current hash
                const dataString = `${entry.sequence_number}|${entry.transaction_type}|${entry.order_id}|${entry.amount}|${entry.vat_amount}|${entry.payment_method}|${entry.timestamp.toISOString()}|${entry.register_id}`;
                const expectedCurrentHash = this.generateHash(dataString, entry.previous_hash);
                if (entry.current_hash !== expectedCurrentHash) {
                    errors.push(`Hash verification failed at sequence ${entry.sequence_number}: data may have been tampered with`);
                }
                expectedPreviousHash = entry.current_hash;
            }
            return { isValid: errors.length === 0, errors };
        });
    }
    // Get journal entries for a specific period
    static getEntriesForPeriod(startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT * FROM legal_journal 
      WHERE timestamp >= $1 AND timestamp <= $2
      ORDER BY sequence_number ASC
    `;
            const result = yield app_1.pool.query(query, [startDate, endDate]);
            return result.rows;
        });
    }
    // Create daily closure bulletin
    static createDailyClosure(date) {
        return __awaiter(this, void 0, void 0, function* () {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            const entries = yield this.getEntriesForPeriod(startOfDay, endOfDay);
            const salesEntries = entries.filter(e => e.transaction_type === 'SALE');
            // Calculate totals and breakdowns
            const totalTransactions = salesEntries.length;
            const totalAmount = salesEntries.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
            const totalVat = salesEntries.reduce((sum, e) => sum + parseFloat(e.vat_amount.toString()), 0);
            // VAT breakdown (French rates: 10% and 20%)
            const vatBreakdown = {
                'vat_10': { amount: 0, vat: 0 },
                'vat_20': { amount: 0, vat: 0 }
            };
            // Payment methods breakdown
            const paymentBreakdown = {};
            salesEntries.forEach(entry => {
                // Payment method totals
                paymentBreakdown[entry.payment_method] = (paymentBreakdown[entry.payment_method] || 0) + parseFloat(entry.amount.toString());
                // VAT breakdown (simplified - would need item-level data for accuracy)
                const vatRate = parseFloat(entry.vat_amount.toString()) / parseFloat(entry.amount.toString());
                if (Math.abs(vatRate - 0.083) < 0.01) { // ~10% VAT (10/110)
                    vatBreakdown.vat_10.amount += parseFloat(entry.amount.toString());
                    vatBreakdown.vat_10.vat += parseFloat(entry.vat_amount.toString());
                }
                else if (Math.abs(vatRate - 0.167) < 0.01) { // ~20% VAT (20/120)
                    vatBreakdown.vat_20.amount += parseFloat(entry.amount.toString());
                    vatBreakdown.vat_20.vat += parseFloat(entry.vat_amount.toString());
                }
            });
            const firstSequence = entries.length > 0 ? Math.min(...entries.map(e => e.sequence_number)) : 0;
            const lastSequence = entries.length > 0 ? Math.max(...entries.map(e => e.sequence_number)) : 0;
            // Generate closure hash
            const closureData = `DAILY|${date.toISOString().split('T')[0]}|${totalTransactions}|${totalAmount}|${totalVat}|${firstSequence}|${lastSequence}`;
            const closureHash = crypto_1.default.createHash('sha256').update(closureData).digest('hex');
            const query = `
      INSERT INTO closure_bulletins (
        closure_type, period_start, period_end, total_transactions, total_amount, 
        total_vat, vat_breakdown, payment_methods_breakdown, first_sequence, 
        last_sequence, closure_hash, is_closed, closed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
            const values = [
                'DAILY',
                startOfDay,
                endOfDay,
                totalTransactions,
                totalAmount,
                totalVat,
                JSON.stringify(vatBreakdown),
                JSON.stringify(paymentBreakdown),
                firstSequence,
                lastSequence,
                closureHash,
                true,
                new Date()
            ];
            const result = yield app_1.pool.query(query, values);
            return result.rows[0];
        });
    }
    // Get closure bulletins
    static getClosureBulletins(type) {
        return __awaiter(this, void 0, void 0, function* () {
            let query = 'SELECT * FROM closure_bulletins';
            const values = [];
            if (type) {
                query += ' WHERE closure_type = $1';
                values.push(type);
            }
            query += ' ORDER BY period_start DESC';
            const result = yield app_1.pool.query(query, values);
            return result.rows;
        });
    }
    // Log transaction in legal journal (called after order creation)
    static logTransaction(order, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const amount = parseFloat(order.total_amount || order.finalAmount);
            const vatAmount = parseFloat(order.total_tax || order.taxAmount);
            return yield this.addEntry('SALE', order.id, amount, vatAmount, order.payment_method || 'cash', {
                order_id: order.id,
                items: order.items || [],
                timestamp: order.created_at || new Date(),
                register_id: this.registerKey
            }, userId);
        });
    }
}
exports.LegalJournalModel = LegalJournalModel;
LegalJournalModel.registerKey = 'MUSEBAR-REG-001'; // Unique register identifier
