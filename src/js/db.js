// SPDX-License-Identifier: GPL-3.0-or-later

'use strict';

// relevant documentation:
// * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import
// * https://stackoverflow.com/a/51258581

export const testExportText = "lorem ipsum";

export const db = new Dexie('auntietuna');

db.version(1).stores({
  good: '++id, domain, *hashes'
});

// open db here to fire off 'ready' events
db.open();

//db.good.count( (count) => {
//  console.log("[db] count =", count);
//});
