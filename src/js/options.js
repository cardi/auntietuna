/* SPDX-License-Identifier: GPL-3.0-or-later */

'use strict';

import {testExportText} from '/js/db.js';

(async function(){

//const db = new Dexie('auntietuna');
const manifest = browser.runtime.getManifest();
const storage = browser.storage.local;

// function defs ///////////////////////////////////////////////////////

/* no longer supported in FF:
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/StorageArea/getBytesInUse
 *//*
function update_storage_used() {
  let bytes = storage.getBytesInUse(null);
  let t = document.getElementById('storageUsed');
  t.textContent = 'Storage used: ' + bytes + ' bytes.';
}//*/

function update_status(txt) {
  var status = document.getElementById('status');
  status.textContent = txt;
}

async function exportHashes(id) {
  if (id == null) {
    // select all
    const result = await db.good.toArray();
    result.then( entries => { console.log(entries); } );
  } else {

  }
}
////////////////////////////////////////////////////////////////////////

// entry point /////////////////////////////////////////////////////////

// TODO keep one 'db' variable around, see 'js/db.js'
//const db = new Dexie('auntietuna').open();

// test module import
console.log("[options] testing imported variable:", testExportText);
console.assert("lorem ipsum" == testExportText, { textExportText: testExportText } );
/////////////////////

const result = await db.good.toArray();
result.then( entries => { console.log(entries); } );

document.getElementById('exportAllHashes')
        .addEventListener('click', exportHashes(null));

////////////////////////////////////////////////////////////////////////
})();
