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

//document.addEventListener('DOMContentLoaded', restore_options);
//document.getElementById('save').addEventListener('click', save_options);
document.getElementById('reset').addEventListener('click', reset);
document.getElementById('loadDefault').addEventListener('click', load_default);
