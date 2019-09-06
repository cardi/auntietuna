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

async function exportHashes(id) {
  if (id == null) {
    // select all
    const result = await db.good.toArray();
    console.log("button:", result);

    let blob = new Blob([result], {type: "application/json;charset=utf-8"});

    let url = window.URL.createObjectURL(blob);
    console.log(url);

    let name = "hashes" + ".json";
    saveAs(blob,name);

  } else {

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
