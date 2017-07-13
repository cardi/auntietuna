function update_storage_used() {
  chrome.storage.local.getBytesInUse(null, function(bytes) {
    var t = document.getElementById('storageUsed');
    t.textContent = 'Storage used: ' + bytes + ' bytes.';
  });
}

function update_status(txt) {
  var status = document.getElementById('status');
  status.textContent = txt;
}

function reset() {
  // XXX for debugging, really. this drops everything.
  // TODO also has to rebuild the database, which this doesn't do
  // -> request.onupgradeneeded
  chrome.runtime.sendMessage({action: 'dropDb'},
    function(response) { console.log("pb options dropDb > " + response.msg); });

  chrome.storage.local.clear(function() {
    update_status('storage cleared.');
  });
  chrome.storage.local.set({'ready': 1}, function() {});
  update_storage_used();
  // should load default stuff.
}

// dedupe and have a util.js
function sendBgMessage(message) {
  chrome.runtime.sendMessage(
    {
      action: 'log',
      msg: message
    },
    function(response) { }
  );//*/
}

function load_default() {
  chrome.runtime.sendMessage(
    { action: 'loadDefault' },
    function(response) {
      sendBgMessage('options recv OK');
      update_status('sent load default hashes to background.js');
      setTimeout(function() {
        // takes some time...since we're not doing this async
        update_storage_used();
      }, 750); // XXX probably update this value
    }
  );//*/
}


//Go to indexedDB and update the table
function accessData() {
  const dbName = "auntie_tuna";
  const dbVer  = 1;

  //make a request to open the database
  var request = window.indexedDB.open(dbName);
  request.onerror = function(event) {
    alert("Why didn't you allow my web app to use IndexedDB?!");
  };
  request.onsuccess = function(event) {
    db = event.target.result;

    //create a transaction to access the object stores that hold data
    var transaction = db.transaction("known_good");
    transaction.oncomplete = function(event) {
      console.log("transaction completed");
    };

    transaction.onerror = function(event){
      console.log("transaction not opened");
    }

    //create objectStore to access data in DB ("readonly")
    var objectStore = transaction.objectStore("known_good");
    //get the site domains
    // var myIndex = objectStore.index("domain");
    // console.log("accessing >> " +myIndex.keyPath);
    // var allKeysRequest = myIndex.getAllKeys();
    // allKeysRequest.onsuccess = function() {
    //   var domainData = allKeysRequest.result;

      var hashIndex = objectStore.index("domain");
      console.log("accesssing >> hashes");
      hashIndex.openCursor().onsuccess = function(event){
        var cursor = event.target.result;
        if(cursor){
            //console.log(cursor.value);
            //loadHashes(cursor.key, cursor.primaryKey);
            loadPage(cursor.key, cursor.value.hashes, cursor.value.last_updated);
            cursor.continue();
        }else {
          console.log("all hashes displayed")
        }
    }

      //console.log(domainData);
    //   loadPage(domainData);
    // }
    //now get the hashes using a cursor to avoid getting
    //domains from primary key
  //
  //   var hashIndex = objectStore.index("hashes");
  //   console.log("accesssing >> hashes");
  //   hashIndex.openKeyCursor().onsuccess = function(event){
  //     var cursor = event.target.result;
  //     if(cursor){
  //         //console.log(cursor.key + " is the hash to " + cursor.primaryKey);
  //         // loadHashes(cursor.key, cursor.primaryKey);
  //
  //         cursor.continue();
  //     }else {
  //       console.log("all hashes displayed")
  //     }
  // }

  };

}

// //loads the hashes Data onto the table, with index of row to get hashes from
// function loadHashes(hashes, site){
//
//   //should loop through table rows to find corresponding site
//   //and then add hash to corresponding table
//    //ex: row.innerHTML = row.innerHTML + hash + ",";
//   var table = document.getElementById("myTable");
//   //var site = table.rows[index].cells[4].innerHTML;
//   for(var i = 1; i < table.rows.length; i++){
//     var currentSite = table.rows[i].cells[4].innerHTML;
//     var currentText = table.rows[i].cells[6].innerHTML;
//     if (site == currentSite){ //figure out a way to do array instead of string
//         table.rows[i].cells[6].innerHTML = currentText + hashes + ", ";
//     }
//   }
//
// }


//loads the data (websites) to options.html table
function loadPage(domain, hash, date){
  var table = document.getElementById("myTable");

//loop through the different websites

    var row = table.insertRow(1);
  	var cell1 = row.insertCell(0);
  	var cell2 = row.insertCell(1);
  	var cell3 = row.insertCell(2);
  	var cell4 = row.insertCell(3);
  	var cell5 = row.insertCell(4);
  	var cell6 = row.insertCell(5);
    var cell7 = row.insertCell(6);

  	cell1.innerHTML = '<button class= "check" ></button>';
  	cell2.innerHTML = '<button class= "trash" ></button>';
  	cell3.innerHTML = '<button class= "reload" ></button>';

    cell4.innerHTML = date;

	  cell5.innerHTML = domain;
    cell6.innerHTML = '<button class = "getHash">debug</button> <button class= download>download</button';
    cell7.innerHTML = hash;
    cell7.classList.add('hidden'); //hidden cell that contains hash to avoid multiple memory accesses

    //console.log("last updated " + domain[i].last_updated);


  //loading button listeners here because they were
  //loaded before buttons were on list if I added the event listeners last
  loadButtons();

}

//retrieve hashes from row index to put into JSON file
function getJSON(){
   var button = this.innerHTML;
   var row = this.parentNode.parentNode;
   var site = row.cells[4].innerHTML;
   console.log(site);
//
//   var hashes = {
//     domain: row.cells[4].innerHTML,
//     date: row.cells[3].innerHTML,
//     hash: row.cells[6].innerHTML
//   };
//
//   var myJSON = JSON.stringify(hashes);
//
// //for now open new window with JSON file
//   var w = window.open();
//   w.document.open();
//   w.document.write('<html><body><pre>' + myJSON + '</pre> </body> </html>');
//   w.document.close();


  console.log("accessing: "+ site);

  var request = window.indexedDB.open("auntie_tuna");

  request.onsuccess = function(event) {
    console.log("accessing database ...");
    db = request.result;

    //open read only transaction
    var transaction = db.transaction("known_good");

    transaction.oncomplete = function(event){
      console.log("...transaction completed");
    }
    transaction.onerror = function(event){
      console.log("...transaction not opened");
    }

    //create objectStore on transaction to delete record from it
    var objectStore = transaction.objectStore("known_good");
    var objectStoreRequest = objectStore.get(site);

    objectStoreRequest.onsuccess = function(event){
      console.log(site + " has been opened to read");
      var info = event.target.result;
      var myJSON = JSON.stringify(info);

      if(button == "debug"){
        console.log("...value retrieved from " + site);
        var w = window.open();
          w.document.open();
          w.document.write('<html><body><pre>' + myJSON + '</pre> </body> </html>');
          w.document.close();

      }else { //button == "download"
        console.log("...hash values have been downloaded");
        var blob = new Blob([myJSON], {type: "application/json;charset=utf-8"});
        var url = window.URL.createObjectURL(blob);
        var name = "hashes." + info.domain + "." + info.last_updated + ".json";

        saveAs(blob,name);
      }

    }
  }

}


function removeRow(){
  var row = this.parentNode.parentNode;
  var site = row.cells[4].innerHTML;
  console.log("removing site: "+ site);

  var request = window.indexedDB.open("auntie_tuna");

  request.onsuccess = function(event) {
    console.log("accessing database ...");
    db = request.result;

    var transaction = db.transaction("known_good", "readwrite");

    transaction.oncomplete = function(event){
      console.log("...transaction completed");
    }
    transaction.onerror = function(event){
      console.log("...transaction not opened");
    }

    //create objectStore on transaction to delete record from it
    var objectStore = transaction.objectStore("known_good");
    var objectStoreRequest = objectStore.delete(site);

    objectStoreRequest.onsuccess = function(event){
      console.log(site + " has been deleted from database");

      //delete table row
      document.getElementById("myTable").deleteRow(row.rowIndex);
    }
  }

}

//be able to import hashes stored as JSON files
function importHash(evt){
  var value;
  var f = this.files[0];
  console.log(f);

  if (f){
    console.log("reading file...");
    var reader = new FileReader();
    reader.readAsText(f);

    reader.onload = function(e){
      var result = JSON.parse(e.target.result);
      value = result;
      console.log(result);
      console.log("the value is: " + value.domain);

      var request = window.indexedDB.open("auntie_tuna");

      request.onsuccess = function(event) {
        console.log("accessing database ...");
        db = request.result;

        var transaction = db.transaction("known_good", "readwrite");

        transaction.oncomplete = function(event){
          console.log("...transaction completed");
        }
        transaction.onerror = function(event){
          console.log("...transaction not opened");
        }

        var objectStore = transaction.objectStore("known_good");
        var objectStoreRequest = objectStore.add(value);

        objectStoreRequest.onsuccess = function(event){
          console.log(value.domain + " has been deleted from database");

          loadPage(value.domain, value.hashes, value.last_updated);
        }
      }

    }
   }

}

//not priority rn, will work on later by looking at contentscript-end.js
function reloadHash() {
  var row = this.parentNode.parentNode;
  var site = row.cells[4].innerHTML;
  console.log("reloading : "+ site);
  //want to open new (invisible?) tab to use to read DOM content and reHash site
  var newWindow = window.open("https://"+site);
  //('about:blank').tab('hide');

  chrome.tabs.query({'active': true, 'currentWindow': true}, function (tabs) {
		//var tabId = tabs[0].id; //get the url of the current tab
    console.log(tabs[0].url);
    console.log(tabs[0].id + " is the tab id to " + tabs[0].url);
    chrome.tabs.sendMessage(tabs[0].id, { action: 'request_dom' }, function(response){
      console.log('response> ' + response);
      if(response.lastError) {
        console.log('error> ' + response.lastError);
      } else {
        // we're successful and we have the hashes
        console.log('msg> ' + response.msg);
      }

    });


  });


}

//not priority rn, will work on later
function enableSite(){
  var row = this.parentNode.parentNode;
  console.log("enabling row: "+ row.rowIndex);
}

//add event listeners to all the buttons on the table
function loadButtons(){
  var hashButtons = document.getElementsByClassName("getHash");
  var trashButtons = document.getElementsByClassName("trash");
  var reloadButtons = document.getElementsByClassName("reload");
  var enableButtons = document.getElementsByClassName("check");
  var downloadButtons = document.getElementsByClassName("download");
  //console.log("hash buttons #: " + hashButtons.length);
  for(var i = 0; i < hashButtons.length; i++){
      hashButtons[i].addEventListener('click', getJSON);
      trashButtons[i].addEventListener('click', removeRow);
      reloadButtons[i].addEventListener('click', reloadHash);
      enableButtons[i].addEventListener('click', enableSite);
      downloadButtons[i].addEventListener('click', getJSON);
  }

}

//document.addEventListener('DOMContentLoaded', restore_options);
//document.getElementById('save').addEventListener('click', save_options);
document.getElementById('reset').addEventListener('click', reset);
document.getElementById('loadDefault').addEventListener('click', load_default);
document.getElementById('import').addEventListener('change', importHash);
//document.getElementById('import').addEventListener('click', importHash);
accessData();
