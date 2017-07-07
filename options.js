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
    var myIndex = objectStore.index("domain");
    console.log("accessing >> " +myIndex.keyPath);
    var allKeysRequest = myIndex.getAllKeys();
    allKeysRequest.onsuccess = function() {
      var domainData = allKeysRequest.result;
      console.log(domainData);
      loadPage(domainData);
    }
    //now get the hashes using a cursor to avoid getting
    //domains from primary key
    var hashIndex = objectStore.index("hashes");
    hashIndex.openKeyCursor().onsuccess = function(event){
      var cursor = event.target.result;
      console.log(cursor);

      if(cursor){
          console.log(cursor.key + " is the hash to " + cursor.primaryKey);
          cursor.continue();
      }else {
        console.log("all hashes displayed")
      }


    }
    // console.log("accessing >> " +hashIndex.keyPath);
    // var allHashesRequest = hashIndex.getAllKeys();
    // allHashesRequest.onsuccess = function() {
    //   var hashesData = allHashesRequest.result;
    //   console.log(hashesData);
    // }
  };
}

//loads the data (websites) to options.html table
function loadPage(domain){
  var table = document.getElementById("myTable");

  for(var i = 0; i < domain.length; i++){
    var row = table.insertRow(1);
  	var cell1 = row.insertCell(0);
  	var cell2 = row.insertCell(1);
  	var cell3 = row.insertCell(2);
  	var cell4 = row.insertCell(3);
  	var cell5 = row.insertCell(4);
  	var cell6 = row.insertCell(5);

  	cell1.innerHTML = '<button class= "check" ></button>';
  	cell2.innerHTML = '<button class= "trash" ></button>';
  	cell3.innerHTML = '<button class= "reload" ></button>';

    cell4.innerHTML = "NEED DATE";

	  cell5.innerHTML = domain[i];
  }
}

//document.addEventListener('DOMContentLoaded', restore_options);
//document.getElementById('save').addEventListener('click', save_options);
document.getElementById('reset').addEventListener('click', reset);
document.getElementById('loadDefault').addEventListener('click', load_default);
accessData();
