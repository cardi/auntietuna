// SPDX-License-Identifier: GPL-3.0-or-later

'use strict';

(async function(){

const db = new Dexie('auntietuna');
const manifest = browser.runtime.getManifest();
const storage = browser.storage.local;

var ready = 0;
var num_hashes = 0;
var dict_hashes = {};

// function defs ///////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////


// entry point /////////////////////////////////////////////////////////

// declare tables, ids and indexes
db.version(1).stores({
	good: '++id, domain, hashes'
});

// load hashes
console.log(manifest.web_accessible_resources);


console.log("[bg] done.");
////////////////////////////////////////////////////////////////////////
})();
