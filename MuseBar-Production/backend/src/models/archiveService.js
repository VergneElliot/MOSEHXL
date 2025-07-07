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
exports.ArchiveService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const app_1 = require("../app");
const legalJournal_1 = require("./legalJournal");
class ArchiveService {
    // Initialize export directory
    static initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!fs_1.default.existsSync(this.EXPORT_DIR)) {
                fs_1.default.mkdirSync(this.EXPORT_DIR, { recursive: true });
            }
        });
    }
    // Create HMAC signature for file integrity
    static createDigitalSignature(data) {
        return crypto_1.default.createHmac('sha256', this.SECRET_KEY).update(data).digest('hex');
    }
    // Verify HMAC signature
    static verifyDigitalSignature(data, signature) {
        const expectedSignature = this.createDigitalSignature(data);
        return crypto_1.default.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
    }
    // Generate file hash for integrity verification
    static generateFileHash(data) {
        return crypto_1.default.createHash('sha256').update(data).digest('hex');
    }
    // Export data in specified format
    static exportData(exportData) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.initialize();
            // Create archive export record
            const query = `
      INSERT INTO archive_exports (
        export_type, period_start, period_end, file_path, file_hash, 
        file_size, format, digital_signature, export_status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
            const tempFilePath = path_1.default.join(this.EXPORT_DIR, `temp_${Date.now()}.${exportData.format.toLowerCase()}`);
            const values = [
                exportData.export_type,
                exportData.period_start,
                exportData.period_end,
                tempFilePath,
                '', // Will be updated after file creation
                0, // Will be updated after file creation
                exportData.format,
                '', // Will be updated after file creation
                'PENDING',
                exportData.created_by
            ];
            const result = yield app_1.pool.query(query, values);
            const archiveExport = result.rows[0];
            try {
                // Generate export data based on type
                const exportContent = yield this.generateExportContent(exportData);
                // Write file
                fs_1.default.writeFileSync(tempFilePath, exportContent);
                // Generate file hash and digital signature
                const fileHash = this.generateFileHash(exportContent);
                const digitalSignature = this.createDigitalSignature(exportContent);
                const fileSize = fs_1.default.statSync(tempFilePath).size;
                // Update archive export record
                const updateQuery = `
        UPDATE archive_exports 
        SET file_hash = $1, file_size = $2, digital_signature = $3, export_status = $4
        WHERE id = $5
        RETURNING *
      `;
                const updateResult = yield app_1.pool.query(updateQuery, [
                    fileHash,
                    fileSize,
                    digitalSignature,
                    'COMPLETED',
                    archiveExport.id
                ]);
                return updateResult.rows[0];
            }
            catch (error) {
                // Update status to failed
                yield app_1.pool.query('UPDATE archive_exports SET export_status = $1 WHERE id = $2', ['FAILED', archiveExport.id]);
                throw error;
            }
        });
    }
    // Generate export content based on format and type
    static generateExportContent(exportData) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            let data = {};
            switch (exportData.export_type) {
                case 'DAILY':
                    if (exportData.period_start) {
                        const closure = yield legalJournal_1.LegalJournalModel.createDailyClosure(exportData.period_start);
                        data = {
                            export_type: 'DAILY',
                            period: {
                                start: exportData.period_start.toISOString(),
                                end: (_a = exportData.period_end) === null || _a === void 0 ? void 0 : _a.toISOString()
                            },
                            closure_data: closure,
                            compliance_info: {
                                legal_reference: 'Article 286-I-3 bis du CGI',
                                export_timestamp: new Date().toISOString(),
                                register_id: 'MUSEBAR-REG-001'
                            }
                        };
                    }
                    break;
                case 'MONTHLY':
                    // Get monthly data
                    const monthStart = exportData.period_start || new Date();
                    monthStart.setDate(1);
                    monthStart.setHours(0, 0, 0, 0);
                    const monthEnd = new Date(monthStart);
                    monthEnd.setMonth(monthEnd.getMonth() + 1);
                    monthEnd.setDate(0);
                    monthEnd.setHours(23, 59, 59, 999);
                    const monthlyEntries = yield legalJournal_1.LegalJournalModel.getEntriesForPeriod(monthStart, monthEnd);
                    const monthlySales = monthlyEntries.filter(e => e.transaction_type === 'SALE');
                    data = {
                        export_type: 'MONTHLY',
                        period: {
                            start: monthStart.toISOString(),
                            end: monthEnd.toISOString()
                        },
                        summary: {
                            total_transactions: monthlySales.length,
                            total_amount: monthlySales.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0),
                            total_vat: monthlySales.reduce((sum, e) => sum + parseFloat(e.vat_amount.toString()), 0)
                        },
                        transactions: monthlySales,
                        compliance_info: {
                            legal_reference: 'Article 286-I-3 bis du CGI',
                            export_timestamp: new Date().toISOString(),
                            register_id: 'MUSEBAR-REG-001'
                        }
                    };
                    break;
                case 'FULL':
                    // Get all journal entries
                    const allEntries = yield app_1.pool.query('SELECT * FROM legal_journal ORDER BY sequence_number ASC');
                    const allClosures = yield legalJournal_1.LegalJournalModel.getClosureBulletins();
                    data = {
                        export_type: 'FULL',
                        export_timestamp: new Date().toISOString(),
                        journal_entries: allEntries.rows,
                        closure_bulletins: allClosures,
                        compliance_info: {
                            legal_reference: 'Article 286-I-3 bis du CGI',
                            register_id: 'MUSEBAR-REG-001',
                            total_entries: allEntries.rows.length,
                            integrity_verification: yield legalJournal_1.LegalJournalModel.verifyJournalIntegrity()
                        }
                    };
                    break;
            }
            // Format data according to specified format
            switch (exportData.format) {
                case 'JSON':
                    return JSON.stringify(data, null, 2);
                case 'XML':
                    return this.convertToXML(data);
                case 'CSV':
                    return this.convertToCSV(data);
                case 'PDF':
                    return this.convertToPDF(data);
                default:
                    return JSON.stringify(data, null, 2);
            }
        });
    }
    // Convert data to XML format
    static convertToXML(data) {
        var _a, _b, _c;
        const xmlDeclaration = '<?xml version="1.0" encoding="UTF-8"?>';
        const rootElement = '<musebar_export>';
        const closingRoot = '</musebar_export>';
        let xmlContent = xmlDeclaration + '\n' + rootElement + '\n';
        // Add compliance header
        xmlContent += '  <compliance_info>\n';
        xmlContent += `    <legal_reference>${((_a = data.compliance_info) === null || _a === void 0 ? void 0 : _a.legal_reference) || 'Article 286-I-3 bis du CGI'}</legal_reference>\n`;
        xmlContent += `    <export_timestamp>${((_b = data.compliance_info) === null || _b === void 0 ? void 0 : _b.export_timestamp) || new Date().toISOString()}</export_timestamp>\n`;
        xmlContent += `    <register_id>${((_c = data.compliance_info) === null || _c === void 0 ? void 0 : _c.register_id) || 'MUSEBAR-REG-001'}</register_id>\n`;
        xmlContent += '  </compliance_info>\n';
        // Add export data
        if (data.export_type === 'DAILY' && data.closure_data) {
            xmlContent += '  <daily_closure>\n';
            xmlContent += `    <total_transactions>${data.closure_data.total_transactions}</total_transactions>\n`;
            xmlContent += `    <total_amount>${data.closure_data.total_amount}</total_amount>\n`;
            xmlContent += `    <total_vat>${data.closure_data.total_vat}</total_vat>\n`;
            xmlContent += `    <period_start>${data.closure_data.period_start}</period_start>\n`;
            xmlContent += `    <period_end>${data.closure_data.period_end}</period_end>\n`;
            xmlContent += '  </daily_closure>\n';
        }
        xmlContent += closingRoot;
        return xmlContent;
    }
    // Convert data to CSV format
    static convertToCSV(data) {
        let csvContent = 'Export Type,Period Start,Period End,Total Transactions,Total Amount,Total VAT,Export Timestamp\n';
        if (data.export_type === 'DAILY' && data.closure_data) {
            csvContent += `${data.export_type},${data.closure_data.period_start},${data.closure_data.period_end},${data.closure_data.total_transactions},${data.closure_data.total_amount},${data.closure_data.total_vat},${data.compliance_info.export_timestamp}\n`;
        }
        else if (data.export_type === 'MONTHLY') {
            csvContent += `${data.export_type},${data.period.start},${data.period.end},${data.summary.total_transactions},${data.summary.total_amount},${data.summary.total_vat},${data.compliance_info.export_timestamp}\n`;
        }
        return csvContent;
    }
    // Convert data to PDF format (simplified)
    static convertToPDF(data) {
        const pdfContent = `
%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 100
>>
stream
BT
/F1 12 Tf
72 720 Td
(MuseBar Export - ${data.export_type}) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
350
%%EOF
    `;
        return pdfContent;
    }
    // Get all archive exports
    static getArchiveExports() {
        return __awaiter(this, void 0, void 0, function* () {
            const query = 'SELECT * FROM archive_exports ORDER BY created_at DESC';
            const result = yield app_1.pool.query(query);
            return result.rows;
        });
    }
    // Get archive export by ID
    static getArchiveExportById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = 'SELECT * FROM archive_exports WHERE id = $1';
            const result = yield app_1.pool.query(query, [id]);
            return result.rows[0] || null;
        });
    }
    // Verify archive export integrity
    static verifyArchiveExport(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const exportRecord = yield this.getArchiveExportById(id);
            if (!exportRecord) {
                return { isValid: false, errors: ['Archive export not found'] };
            }
            const errors = [];
            try {
                // Check if file exists
                if (!fs_1.default.existsSync(exportRecord.file_path)) {
                    errors.push('Export file not found');
                    return { isValid: false, errors };
                }
                // Read file content
                const fileContent = fs_1.default.readFileSync(exportRecord.file_path, 'utf8');
                // Verify file hash
                const currentHash = this.generateFileHash(fileContent);
                if (currentHash !== exportRecord.file_hash) {
                    errors.push('File hash verification failed - file may have been tampered with');
                }
                // Verify digital signature
                if (!this.verifyDigitalSignature(fileContent, exportRecord.digital_signature)) {
                    errors.push('Digital signature verification failed - file authenticity compromised');
                }
                // Verify file size
                const currentSize = fs_1.default.statSync(exportRecord.file_path).size;
                if (currentSize !== exportRecord.file_size) {
                    errors.push('File size mismatch - file may have been modified');
                }
                // Update verification timestamp if valid
                if (errors.length === 0) {
                    yield app_1.pool.query('UPDATE archive_exports SET export_status = $1, verified_at = $2 WHERE id = $3', ['VERIFIED', new Date(), id]);
                }
                return { isValid: errors.length === 0, errors };
            }
            catch (error) {
                errors.push(`Error during verification: ${error}`);
                return { isValid: false, errors };
            }
        });
    }
    // Download archive export file
    static downloadArchiveExport(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const exportRecord = yield this.getArchiveExportById(id);
            if (!exportRecord || !fs_1.default.existsSync(exportRecord.file_path)) {
                return null;
            }
            const fileName = `musebar_export_${exportRecord.export_type}_${exportRecord.id}.${exportRecord.format.toLowerCase()}`;
            return {
                filePath: exportRecord.file_path,
                fileName
            };
        });
    }
}
exports.ArchiveService = ArchiveService;
ArchiveService.EXPORT_DIR = path_1.default.join(process.cwd(), 'exports');
ArchiveService.SECRET_KEY = 'MUSEBAR-LEGAL-COMPLIANCE-2025'; // In production, use environment variable
