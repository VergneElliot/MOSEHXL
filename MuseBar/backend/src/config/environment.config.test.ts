import { afterEach, describe, expect, it } from 'vitest';
import { getEnvironmentConfig } from './environment';

describe('getEnvironmentConfig', () => {
  const keys = [
    'NODE_ENV',
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET',
    'CORS_ORIGIN',
    'PORT',
    'HOST',
    'ESTABLISHMENT_ADMIN_PERMISSION_MODE',
    'LEGAL_JOURNAL_ENABLED',
    'AUTO_CLOSURE_ENABLED',
    'SWAGGER_ENABLED',
    'LOG_LEVEL',
    'DB_SSL_ALLOW_SELF_SIGNED',
    'DB_SSL_REJECT_UNAUTHORIZED',
  ] as const;

  const snapshot: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const key of keys) {
      if (snapshot[key] === undefined) delete process.env[key];
      else process.env[key] = snapshot[key];
    }
  });

  function capture() {
    for (const key of keys) {
      snapshot[key] = process.env[key];
    }
  }

  it('parses development defaults and comma-separated CORS origins', () => {
    capture();
    process.env.NODE_ENV = 'development';
    process.env.DB_HOST = 'db.local';
    process.env.DB_PORT = '5433';
    process.env.DB_NAME = 'muse_dev';
    process.env.DB_USER = 'u';
    process.env.DB_PASSWORD = 'p';
    process.env.JWT_SECRET = 'x'.repeat(32);
    process.env.CORS_ORIGIN = 'http://a.local, http://b.local';
    process.env.PORT = '4000';
    process.env.HOST = '127.0.0.1';
    process.env.LEGAL_JOURNAL_ENABLED = 'false';
    process.env.SWAGGER_ENABLED = 'true';
    process.env.LOG_LEVEL = 'warn';
    delete process.env.ESTABLISHMENT_ADMIN_PERMISSION_MODE;

    const cfg = getEnvironmentConfig();
    expect(cfg.database.host).toBe('db.local');
    expect(cfg.database.port).toBe(5433);
    expect(cfg.database.ssl).toBe(false);
    expect(cfg.server.port).toBe(4000);
    expect(cfg.server.corsOrigins).toEqual(['http://a.local', 'http://b.local']);
    expect(cfg.security.establishmentAdminPermissionMode).toBe('implicit_all');
    expect(cfg.features.legalJournalEnabled).toBe(false);
    expect(cfg.features.swaggerEnabled).toBe(true);
    expect(cfg.logging.level).toBe('warn');
  });

  it('uses production SSL and explicit_only admin permission default', () => {
    capture();
    process.env.NODE_ENV = 'production';
    process.env.DB_HOST = 'db';
    process.env.DB_PORT = '5432';
    process.env.DB_NAME = 'muse';
    process.env.DB_USER = 'u';
    process.env.DB_PASSWORD = 'p';
    process.env.JWT_SECRET = 'y'.repeat(32);
    delete process.env.CORS_ORIGIN;
    process.env.DB_SSL_ALLOW_SELF_SIGNED = 'true';
    delete process.env.DB_SSL_REJECT_UNAUTHORIZED;
    delete process.env.ESTABLISHMENT_ADMIN_PERMISSION_MODE;
    process.env.AUTO_CLOSURE_ENABLED = 'false';

    const cfg = getEnvironmentConfig();
    expect(cfg.database.ssl).toBe(true);
    expect(cfg.database.sslRejectUnauthorized).toBe(false);
    expect(cfg.security.establishmentAdminPermissionMode).toBe('explicit_only');
    expect(cfg.features.autoClosureEnabled).toBe(false);
    expect(cfg.server.corsOrigins).toEqual([]);
    expect(cfg.server.trustProxy).toBe(true);
  });

  it('honors ESTABLISHMENT_ADMIN_PERMISSION_MODE override', () => {
    capture();
    process.env.NODE_ENV = 'test';
    process.env.DB_PASSWORD = 'p';
    process.env.JWT_SECRET = 'z'.repeat(32);
    process.env.ESTABLISHMENT_ADMIN_PERMISSION_MODE = 'explicit_only';

    expect(getEnvironmentConfig().security.establishmentAdminPermissionMode).toBe(
      'explicit_only'
    );
  });
});
