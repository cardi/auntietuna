// SPDX-License-Identifier: GPL-3.0-or-later

'use strict';

import {db, testExportText} from '/js/db.js';

(async function(){

const manifest = browser.runtime.getManifest();
const storage  = browser.storage.local;
let DEBUG      = false;

// function defs ///////////////////////////////////////////////////////
function onError(error) { DEBUG && console.error("[options]", `${error}`); }

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

  DEBUG && console.log("[options/exportHashes]", "exporting to", name);

  // use FileSaver to save file
  saveAs(blob, name);
}

async function exportSelectedHashes() {
  let ids = []
  let sites = document.querySelectorAll("ul#list-sites input");
  sites.forEach( (element) => {
    if(element.type === 'checkbox' && element.checked === true && element.value != "all") {
      //console.log("checked:", element.value);
      ids.push(element.value);
    }
  });
  DEBUG && console.log("[options/exportSelectedHashes] export checked:", ids);
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

// dropzone handling
function handleFilePicker() {
  importFiles(this.files);
}

function drop(e) {
  if (true) {
    e.dataTransfer.dropEffect = "copy";
    e.stopPropagation();
    e.preventDefault();
    importFiles(e.dataTransfer.files);
    importFileZone.style.display = "none";
  }
}

// dropzone: ignore drag enter/over events
function dragenter(e) { e.stopPropagation(); e.preventDefault(); }
function dragover(e)  { e.stopPropagation(); e.preventDefault(); }

// XXX work-in-progress
// TODO add link to each row to display hashes
async function updateDisplaySites() {
  const result = await db.good.toArray();
  DEBUG && console.debug("[options/updateDisplaySites]", result);

  // remove all the list items (that aren't .permanent, for display)
  const listsUl = document.querySelector('#list-sites');
  while (listsUl.firstChild &&
    (!listsUl.firstChild.classList || !listsUl.firstChild.classList.contains("permanent"))) {
    listsUl.removeChild(listsUl.firstChild);
  }

  let penultEntry = listsUl.firstChild;

  for(const entry of result) {
    var li = document.createElement('li');
    let checkbox = document.createElement('input');
    checkbox.type = "checkbox";
    checkbox.value = entry.id;
    li.appendChild(checkbox);

    let span = document.createElement('span');
    span.textContent = " " + entry.domain + ", ";

    // span element for last updated (YYYY-MM-DD)
    let spanDate = document.createElement('span');
    spanDate.className = "date";
    spanDate.textContent = (entry.last_updated).slice(0,10);
    span.appendChild(spanDate);

    // span element for our tools
    let spanTools = document.createElement('span');
    spanTools.className = "tools";

    // tool #1: delete
    let toolsTrash = document.createElement('img');
    toolsTrash.src = "img/trash.svg";
    toolsTrash.onclick = function() { deleteHash(entry.id); };
    spanTools.appendChild(toolsTrash);
    span.appendChild(spanTools);

    li.appendChild(span);

    listsUl.insertBefore(li, penultEntry);
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
      DEBUG && console.log("[options/loadDefaultHashes] ignoring processing:", hashes_list_entry);
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
      DEBUG && console.log("[options/loadDefaultHashes] response from background:", msgResp.response);

      updateDisplayStatus(`Files ${JSON.stringify(manifest.web_accessible_resources)} successfully imported!`);
      await updateDisplaySites();
    }, onError);
  }
}

// back-end functions for UI elements
async function importFiles(fileList) {
  if (fileList == null) {
    DEBUG && console.log("[options/importFiles] fileList is null, returning");
    return;
  }
  DEBUG && console.debug("[options/importFiles]", fileList);

  // build object URLs to send to background script
  // XXX do we validate here or in bg?
  let fileListURLs = [];
  let fileListNames = [];
  for (let i=0; i<fileList.length; i++) {
    const objectURL = window.URL.createObjectURL(fileList[i]);
    fileListURLs.push(objectURL);
    fileListNames.push(fileList[i].name);
  }
  DEBUG && console.debug("[options/importFiles] fileListURL =", fileListURLs);

  // send file URLs to background script for processing
  var msgSendImport = browser.runtime.sendMessage({
                      action: 'options_import_hashes',
                      files: fileListURLs
                    });

  // process response or display error message (`importFileStatus`)
  msgSendImport.then( async msgResp => {
    DEBUG && console.log("[options/importFiles] response from background:", msgResp.response);

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
///*
await storage.get("debug").then( (result) => {
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

// full-screen window drop zone
window.addEventListener('dragenter', (e) => {
  importFileZone.style.display = "flex";
});
const importFileZone = document.getElementById('importFileZone');
importFileZone.addEventListener("dragenter", dragenter, false);
importFileZone.addEventListener("dragover", dragover, false);
importFileZone.addEventListener("drop", drop, false);

importFileZone.addEventListener("dragleave", (e) => {
  importFileZone.style.display = "none";
});

document.getElementById('resetHashes')
        .addEventListener('click', () => resetHashes(), false);

document.getElementById('loadDefaultHashes')
        .addEventListener('click', () => loadDefaultHashes(), false);

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
