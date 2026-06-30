/* eslint-disable @typescript-eslint/no-require-imports */
const Database = require('better-sqlite3');
const path = require('path');
// DATABASE_URL is file:./dev.db — file is at project root
const db = new Database(path.join(__dirname, '..', 'dev.db'));
db.pragma('journal_mode=WAL');
const r = db
  .prepare("UPDATE SystemSetting SET value = 'false' WHERE key = 'queue.auto_advance_on_no_show'")
  .run();
console.log('Updated', r.changes, 'row(s)');
const row = db
  .prepare("SELECT key, value FROM SystemSetting WHERE key = 'queue.auto_advance_on_no_show'")
  .get();
console.log('New value:', row);
db.close();
