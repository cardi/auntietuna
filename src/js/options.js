/* SPDX-License-Identifier: GPL-3.0-or-later */

'use strict';

import {db, testExportText} from '/js/db.js';

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

// TODO `id` should be an array of ints
async function exportHashes(id) {
  if (id == null) {
    // select all
    const result = await db.good.toArray();
    //console.debug("button:", result);
    let data = JSON.stringify(result);
    //console.debug("data:", data);

    // build json blob for saving
    let blob = new Blob([data], {type: "application/json;charset=utf-8"});

    // build filename
    let date = new Date();
    let url = window.URL.createObjectURL(blob);
    let name = `hashes-${date.toJSON()}.json`;

    console.log("[options/exportHashes]", "exporting to", name);

    // use FileSaver to save file
    saveAs(blob, name);
  } else {
    // TODO select one or more rows by id, and export
  }
}
////////////////////////////////////////////////////////////////////////

// entry point /////////////////////////////////////////////////////////

// test module import
console.log("[options] testing imported variable:", testExportText);
console.assert("lorem ipsum" == testExportText, { textExportText: testExportText } );
///////////////////*/

// add event listeners to options.html
document.getElementById('exportAllHashes')
        .addEventListener('click', () => exportHashes(null), false);

////////////////////////////////////////////////////////////////////////
})();
