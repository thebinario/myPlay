#!/usr/bin/env node
/**
 * Applies pending migrations to a Midoteca database and prints the result.
 *
 * Usage:
 *   node scripts/migrate.cjs [path/to/midoteca.db]
 *
 * With no argument it uses the default per-user application data directory.
 * Requires a build first (`npm run build`).
 */
const path = require('node:path');
const { createMidoteca } = require('../dist/index.js');

const target = process.argv[2];
const app = createMidoteca(target ? { databaseFile: path.resolve(target) } : {});

const migration = app.migration;
if (!migration) {
  console.log('Database opened without running migrations.');
} else if (migration.applied.length === 0) {
  console.log(`Schema up to date (version ${migration.currentVersion}).`);
} else {
  console.log(
    `Applied migrations: ${migration.applied.join(', ')} (version ${migration.currentVersion}).`,
  );
}
app.close();
