/* SPDX-License-Identifier: GPL-3.0-or-later */

'use strict';

import {db, testExportText} from '/js/db.js';

(async function(){

const manifest = browser.runtime.getManifest();
const storage = browser.storage.local;

// function defs ///////////////////////////////////////////////////////
function onError(error) { console.error("[options]", `${error}`); }

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

// TODO work-in-progress
async function updateDisplaySites() {
  const result = await db.good.toArray();
  console.debug("[options/updateDisplaySites]", result);

  let displayText = "<ul>";
  for(const entry of result) {
    let entryText = "<li>";
    entryText += '<label><input type="checkbox" style="margin-right: 0.5em">'
    entryText += entry.domain + "\t(id: " + entry.id + ", last updated: " + entry.last_updated;
    entryText += ", imported on: " + entry.imported + ")";
    entryText += "</label></li>";

    displayText += entryText;
  }
  displayText += "</ul>";

  const sites = document.getElementById('sites');
  sites.innerHTML = displayText;
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

// test module import
console.log("[options] testing imported variable:", testExportText);
console.assert("lorem ipsum" == testExportText, { textExportText: testExportText } );
///////////////////*/

// add event listeners to options.html
document.getElementById('exportAllHashes')
        .addEventListener('click', () => exportHashes(null), false);

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

// update options page with list of hashes inside db and we're done
await updateDisplaySites();
////////////////////////////////////////////////////////////////////////
})();
