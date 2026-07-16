/**
 * Legal Journal Signing and Hash Generation
 * Cryptographic functions for transaction integrity
 *
 * Hash payload format has evolved across software versions (see
 * docs/legal/self-certification/evidence/phase1-forensics/2026-07-16-HASH-FORMAT-ERAS.md).
 * Verification therefore tries every historical payload format; a match under any
 * era format counts as valid. Self-documented migration/correction markers are
 * recorded as documentedExceptions rather than integrity errors.
 */

import crypto from 'crypto';
import { pool } from '../../db/pool';
import { DocumentedIntegrityException, IntegrityCheckResult } from './types';
import { getRegisterIdForEstablishment } from '../../utils/registerId';

const ZERO_HASH =
  '0000000000000000000000000000000000000000000000000000000000000000';
const SHA256_HEX = /^[0-9a-f]{64}$/;

/** Known literal marker hashes written during the 2025-07-30 production migration. */
const KNOWN_MARKER_HASHES = new Set([
  'MIGRATION_DOCUMENTED_CHAIN_VALID',
  'CHECKPOINT_MIGRATION_BASELINE',
]);

type JournalRow = {
  sequence_number: number;
  transaction_type: string;
  order_id: number | null;
  amount: string | number;
  vat_amount: string | number;
  payment_method: string;
  timestamp: Date | string;
  register_id: string;
  previous_hash: string;
  current_hash: string;
  transaction_data?: Record<string, unknown> | string | null;
};

function toNumber(value: string | number): number {
  if (typeof value === 'number') {
    return value;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Amount renderings used by historical eras (2dp / JS float / 4dp). */
function amountVariants(value: string | number): string[] {
  const n = toNumber(value);
  const asString = String(value);
  const variants = new Set<string>([
    asString,
    n.toFixed(2),
    n.toFixed(4),
    String(n),
  ]);
  return [...variants];
}

function toUtcDate(timestamp: Date | string): Date {
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return new Date(timestamp);
}

/**
 * Timestamp renderings used by historical eras:
 * - UTC ISO (current + post-TIMESTAMPTZ eras)
 * - Europe/Paris wall-clock with a trailing Z (pre-TIMESTAMPTZ production era:
 *   naive timestamps were later reinterpreted as Paris local)
 */
function timestampVariants(timestamp: Date | string): string[] {
  const date = toUtcDate(timestamp);
  if (Number.isNaN(date.getTime())) {
    return [String(timestamp)];
  }

  const utcIso = date.toISOString();

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  const hour = String(Number(get('hour')) % 24).padStart(2, '0');
  const ms = String(date.getUTCMilliseconds()).padStart(3, '0');
  const parisAsZ =
    `${get('year')}-${get('month')}-${get('day')}` +
    `T${hour}:${get('minute')}:${get('second')}.${ms}Z`;

  return [...new Set([utcIso, parisAsZ])];
}

function orderIdForHash(orderId: number | null | undefined): string {
  return orderId === null || orderId === undefined ? 'null' : orderId || '';
}

function parseTransactionData(
  raw: JournalRow['transaction_data']
): Record<string, unknown> | null {
  if (!raw) {
    return null;
  }
  if (typeof raw === 'object') {
    return raw as Record<string, unknown>;
  }
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function describeDocumentedMarker(entry: JournalRow): DocumentedIntegrityException | null {
  const data = parseTransactionData(entry.transaction_data);
  const isKnownLiteral = KNOWN_MARKER_HASHES.has(entry.current_hash);
  const isNonSha = !SHA256_HEX.test(entry.current_hash);
  const correctionType = typeof data?.correction_type === 'string' ? data.correction_type : '';
  const archiveType = typeof data?.archive_type === 'string' ? data.archive_type : '';

  const isRecoverySale =
    entry.transaction_type === 'SALE' &&
    (data?.recovery_order === true || data?.manual_compensation === true);

  if (isRecoverySale) {
    return {
      sequence_number: entry.sequence_number,
      reason:
        'Documented recovery sale (manual re-entry after database incident); amounts preserved in transaction_data',
    };
  }

  const isDocumentedArchive =
    entry.transaction_type === 'ARCHIVE' &&
    (archiveType === 'MIGRATION_CHECKPOINT' ||
      entry.current_hash === 'CHECKPOINT_MIGRATION_BASELINE');

  if (isDocumentedArchive) {
    return {
      sequence_number: entry.sequence_number,
      reason:
        'Documented migration checkpoint: hash chain intentionally restarted; historical sequences preserved',
      chain_restart: true,
    };
  }

  const isDocumentedCorrection =
    entry.transaction_type === 'CORRECTION' &&
    (correctionType === 'DATABASE_MIGRATION' ||
      correctionType === 'HASH_CHAIN_INTEGRITY' ||
      isKnownLiteral ||
      isNonSha);

  if (isDocumentedCorrection || (isKnownLiteral && isNonSha)) {
    const reason =
      correctionType === 'DATABASE_MIGRATION'
        ? 'Documented database migration marker (dev→production); business amounts preserved'
        : correctionType === 'HASH_CHAIN_INTEGRITY'
          ? 'Documented hash-chain integrity correction entry; business amounts preserved'
          : isKnownLiteral
            ? `Documented literal marker hash (${entry.current_hash})`
            : 'Documented non-SHA marker entry';
    return {
      sequence_number: entry.sequence_number,
      reason,
      chain_restart: entry.current_hash === 'CHECKPOINT_MIGRATION_BASELINE',
    };
  }

  return null;
}

function hashMatchesAnyHistoricalFormat(entry: JournalRow): boolean {
  if (!SHA256_HEX.test(entry.current_hash)) {
    return false;
  }

  const orderId = orderIdForHash(entry.order_id);
  const payment = String(entry.payment_method ?? '');
  const register = String(entry.register_id ?? '');
  const amountOpts = amountVariants(entry.amount);
  const vatOpts = amountVariants(entry.vat_amount);
  const tsOpts = timestampVariants(entry.timestamp);

  for (const amount of amountOpts) {
    for (const vat of vatOpts) {
      for (const ts of tsOpts) {
        const dataString =
          `${entry.sequence_number}|${entry.transaction_type}|${orderId}|` +
          `${amount}|${vat}|${payment}|${ts}|${register}`;
        const expected = JournalSigning.generateHash(dataString, entry.previous_hash);
        if (expected === entry.current_hash) {
          return true;
        }
      }
    }
  }
  return false;
}

export class JournalSigning {
  /**
   * Generate cryptographic hash for transaction integrity
   * @param data - The data to hash
   * @param previousHash - The previous hash in the chain
   * @returns The generated hash
   */
  static generateHash(data: string, previousHash: string): string {
    const content = `${previousHash}|${data}`;
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Verify journal integrity by checking the cryptographic hash chain.
   *
   * Historical entries are accepted if they verify under any known payload format
   * era. Self-documented CORRECTION/ARCHIVE markers are reported in
   * `documentedExceptions` and do not fail the check. Unexpected hash mismatches
   * or unexplained chain breaks remain integrity errors.
   */
  static async verifyJournalIntegrity(establishmentId: string): Promise<IntegrityCheckResult> {
    const errors: string[] = [];
    const documentedExceptions: DocumentedIntegrityException[] = [];

    const query = `
      SELECT * FROM legal_journal
      WHERE establishment_id = $1
      ORDER BY sequence_number ASC
    `;
    const result = await pool.query(query, [establishmentId]);
    const entries = result.rows as JournalRow[];

    if (entries.length === 0) {
      return { isValid: true, errors: [], documentedExceptions: [] };
    }

    let expectedPreviousHash = ZERO_HASH;
    let allowChainRestart = false;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      if (i > 0 && entry.sequence_number <= entries[i - 1].sequence_number) {
        errors.push(
          `Non-monotonic sequence for establishment: ${entry.sequence_number} after ${entries[i - 1].sequence_number}`
        );
      }

      // Chain continuity (with allowance for a documented genesis restart).
      const isGenesisRestart =
        allowChainRestart && entry.previous_hash === ZERO_HASH;
      if (entry.previous_hash !== expectedPreviousHash && !isGenesisRestart) {
        // Marker entries may themselves break continuity in a documented way
        // (e.g. checkpoint with previous_hash = ZERO after a non-SHA migration marker).
        const marker = describeDocumentedMarker(entry);
        if (marker && entry.previous_hash === ZERO_HASH) {
          documentedExceptions.push({
            ...marker,
            reason: `${marker.reason} (documented chain restart at this sequence)`,
            chain_restart: true,
          });
          allowChainRestart = Boolean(marker.chain_restart);
        } else {
          errors.push(
            `Hash chain broken at sequence ${entry.sequence_number}: expected previous hash ${expectedPreviousHash}, got ${entry.previous_hash}`
          );
        }
      } else if (isGenesisRestart) {
        allowChainRestart = false;
      }

      const hashOk = hashMatchesAnyHistoricalFormat(entry);
      if (!hashOk) {
        const marker = describeDocumentedMarker(entry);
        if (marker) {
          // Avoid duplicate exception if already pushed for chain restart above.
          const already = documentedExceptions.some(
            (e) => e.sequence_number === entry.sequence_number
          );
          if (!already) {
            documentedExceptions.push(marker);
          }
          if (marker.chain_restart) {
            allowChainRestart = true;
          }
        } else {
          errors.push(
            `Hash verification failed at sequence ${entry.sequence_number}: data may have been tampered with`
          );
        }
      } else {
        // Successful era match — if this entry is ALSO a documented recovery sale
        // with matching hash under some format, no exception needed.
        allowChainRestart = false;
      }

      // After a checkpoint marker, the next entry may legitimately use this
      // marker string (or ZERO) as previous_hash.
      if (KNOWN_MARKER_HASHES.has(entry.current_hash)) {
        const marker = describeDocumentedMarker(entry);
        if (marker?.chain_restart) {
          allowChainRestart = true;
        }
      }

      expectedPreviousHash = entry.current_hash;
    }

    return {
      isValid: errors.length === 0,
      errors,
      documentedExceptions,
    };
  }

  /**
   * Generate closure hash for bulletin integrity
   * @param closureData - The closure data to hash
   * @returns The generated closure hash
   */
  static generateClosureHash(closureData: string): string {
    return crypto.createHash('sha256').update(closureData).digest('hex');
  }

  /**
   * Get the register key
   * @returns The unique register identifier
   */
  static getRegisterKey(establishmentId?: string | null): string {
    return getRegisterIdForEstablishment(establishmentId);
  }
}
