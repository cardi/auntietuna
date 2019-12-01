// SPDX-License-Identifier: GPL-3.0-or-later

'use strict';

import {db, testExportText} from '/js/db.js';

(async function(){

const manifest = browser.runtime.getManifest();
const storage  = browser.storage.local;
let DEBUG      = false;

// function defs ///////////////////////////////////////////////////////
function onError(error) { console.error("[options]", `${error}`); }

async function exportHashes(ids) {
  let result = [];
  // TODO select only certain keys instead of all of them
  if (ids == null) {
    // select all
    result = await db.good.toArray();
  } else {
    // `ids` input is initially an array of strings
    result = await db.good.where('id').anyOf(ids.map(Number)).toArray();
  }

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
}

async function exportSelectedHashes() {
  let ids = []
  let sites = document.querySelectorAll("div#sites input");
  sites.forEach( (element) => {
    if(element.type === 'checkbox' && element.checked === true && element.value != "all") {
      //console.log("checked:", element.value);
      ids.push(element.value);
    }
  });
  console.log("[options/exportSelectedHashes] export checked:", ids);
  if(ids.length != 0) {
    exportHashes(ids);
  }
}

async function deleteHash(id) {
  await db.good.where('id').equals(id).delete();
  await updateDisplaySites();
}

async function resetHashes() {
  await db.good.clear();
  updateDisplayStatus("Database cleared!");
  await updateDisplaySites();
}

// function defs for UI elements ///////////////////////////////////////
function handleFilePicker() {
  importFiles(this.files);
}

function drop(e) {
  e.stopPropagation();
  e.preventDefault();
  importFiles(e.dataTransfer.files);
}

// ignore drag enter/over events
// TODO UX: change div background on dragover
function dragenter(e) { e.stopPropagation(); e.preventDefault(); }
function dragover(e) { e.stopPropagation(); e.preventDefault(); }

// XXX work-in-progress
// TODO add link to each row to display hashes
async function updateDisplaySites() {
  const result = await db.good.toArray();
  console.debug("[options/updateDisplaySites]", result);

  // remove the table
  const tbody = document.querySelector('#tbl-sites tbody');
  while (tbody.firstChild) tbody.removeChild(tbody.firstChild);

  // use templates instead of {insertAdjacentHTML, .innerHTML}
  if ('content' in document.createElement('template')) {
    var template = document.querySelector('#tbl-sites-row');
    //console.log(template);

    for(const entry of result) {
      let clone = document.importNode(template.content, true);
      var td = clone.querySelectorAll("td");

      let label = document.createElement('label')
      let checkbox = document.createElement('input');
      checkbox.type = "checkbox";
      checkbox.style.marginRight = "0.5em";
      checkbox.value = entry.id;
      let text = document.createTextNode(entry.id);

      td[0].appendChild(label);
      label.appendChild(checkbox);
      label.appendChild(text);
      /**/

      // TODO replace with a trash can icon
      let delBtn = document.createElement('button');
      delBtn.textContent = "Delete";
      delBtn.onclick = function() { deleteHash(entry.id); };
      td[1].appendChild(delBtn);

      /**/
      td[2].textContent = entry.domain;
      td[3].textContent = entry.last_updated;
      td[4].textContent = entry.imported;

      tbody.appendChild(clone);
    }
  } else {
    // TODO
    console.error("templates not supported");
  }
}

function updateDisplayStatus(txt) {
  document.getElementById('status').textContent = txt;
}

function loadDefaultHashes() {
  let hashes_list = [];
  for (const hashes_list_entry of manifest.web_accessible_resources) {
    let hashes_url = browser.runtime.getURL(hashes_list_entry);
    if (/(.json)$/.test(hashes_url)) {
      hashes_list.push(hashes_url);
    } else {
      console.log("[options/loadDefaultHashes] ignoring processing:", hashes_list_entry);
    }
  }

  if (hashes_list.length > 0) {
    // send file URLs to background script for processing
    var msgSendImport = browser.runtime.sendMessage({
                        action: 'options_import_hashes',
                        files: hashes_list
                      });

    // process response or display error message (`importFileStatus`)
    msgSendImport.then( async msgResp => {
      console.log("[options/loadDefaultHashes] response from background:", msgResp.response);

      updateDisplayStatus(`Files ${JSON.stringify(manifest.web_accessible_resources)} successfully imported!`);
      await updateDisplaySites();
    }, onError);
  }
}

// back-end functions for UI elements
async function importFiles(fileList) {
  if (fileList == null) {
    console.log("[options/importFiles] fileList is null, returning");
    return;
  }
  console.debug("[options/importFiles]", fileList);

  // build object URLs to send to background script
  // XXX do we validate here or in bg?
  let fileListURLs = [];
  let fileListNames = [];
  for (let i=0; i<fileList.length; i++) {
    const objectURL = window.URL.createObjectURL(fileList[i]);
    fileListURLs.push(objectURL);
    fileListNames.push(fileList[i].name);
  }
  console.debug("[options/importFiles] fileListURL =", fileListURLs);

  // send file URLs to background script for processing
  var msgSendImport = browser.runtime.sendMessage({
                      action: 'options_import_hashes',
                      files: fileListURLs
                    });

  // process response or display error message (`importFileStatus`)
  msgSendImport.then( async msgResp => {
    console.log("[options/importFiles] response from background:", msgResp.response);

    const importFileStatus = document.getElementById('importFileStatus');
    importFileStatus.innerText = `Files ${JSON.stringify(fileListNames)} successfully imported!`;

    // refresh page (or dynamically update list of hashes)
    await updateDisplaySites();
  }, onError);

  return;
}
////////////////////////////////////////////////////////////////////////

// entry point /////////////////////////////////////////////////////////

// XXX need to add event listeners before `await storage.get(...)`
// otherwise function doesn't get called.
// TODO check behavior on chromium
document.addEventListener("DOMContentLoaded", restoreOptions);

// get debug preference value from storage
/*await storage.get("debug").then( (result) => {
  if("debug" in result) {
    if(result.debug === true) {
      // enable debugging messages
      DEBUG = true;
      DEBUG && console.debug("[options] result =", result);
    }
  }
}, onError);//*/

// test module import
DEBUG && console.log("[options] testing imported variable:", testExportText);
DEBUG && console.assert("lorem ipsum" == testExportText, { textExportText: testExportText } );
///////////////////*/

// add event listeners to options.html
document.getElementById('exportAllHashes')
        .addEventListener('click', () => exportHashes(null), false);

document.getElementById('exportSelectedHashes')
        .addEventListener('click', () => exportSelectedHashes(), false);

document.getElementById('importFilePicker')
        .addEventListener('change', handleFilePicker, false);

const inputFileZone = document.getElementById('importFileZone');
inputFileZone.addEventListener("dragenter", dragenter, false);
inputFileZone.addEventListener("dragover", dragover, false);
inputFileZone.addEventListener("drop", drop, false);

document.getElementById('resetHashes')
        .addEventListener('click', () => resetHashes(), false);

document.getElementById('loadDefaultHashes')
        .addEventListener('click', () => loadDefaultHashes(), false);

let selectAll = document.getElementById('selectAll')
selectAll.addEventListener('click', () => {
  let sites = document.querySelectorAll("div#sites input");
  let check = selectAll.checked;
  sites.forEach( (element) => {
    element.checked = check;
  });
}, false);

// for enabling/disabling debug mode
document.getElementById('debug')
        .addEventListener('change', (e) => {
          DEBUG && console.log("[options/debug] e.target.checked =", e.target.checked);
          e.preventDefault();
          storage.set({ debug: e.target.checked });
        }, false);

function restoreOptions() {

  DEBUG && console.debug('[options/restoreOptions] called');

  function onError(error) {
    DEBUG && console.log(`[options/restoreOptions] Error: ${error}`);
  }

  var getting = storage.get("debug");
  getting.then( (result) => {
    DEBUG && console.debug("[options/restoreOptions]", result);
    if("debug" in result) {
      document.getElementById('debug').checked = result.debug;
    } else {
      DEBUG && console.debug("[options/restoreOptions] key 'debug' doesn't exist in result");
    }
  }, onError);
}

// QoL: subscribe to changes in the db and update the page when possible.
// note that dexie-observable.js needs to be imported on the producer
// (i.e., background.js) and consumer side
db.on('changes', function(changes) {
  updateDisplaySites();
});

// update options page with list of hashes inside db and we're done
await updateDisplaySites();

// display the version number
document.getElementById('version')
        .insertAdjacentText('afterbegin', manifest.version);

////////////////////////////////////////////////////////////////////////
})();
