var name = "";

function onSignIn(googleUser) {
        // Useful data for your client-side scripts:
        var profile = googleUser.getBasicProfile();

				name = profile.getName();


        console.log("ID: " + profile.getId()); // Don't send this directly to your server!
        console.log('Full Name: ' + name);
        console.log('Given Name: ' + profile.getGivenName());
        console.log('Family Name: ' + profile.getFamilyName());
        console.log("Image URL: " + profile.getImageUrl());
        console.log("Email: " + profile.getEmail());

        // The ID token you need to pass to your backend:
        var id_token = googleUser.getAuthResponse().id_token;
        console.log("ID Token: " + id_token);
      };


function signOut() {
    var auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(function () {
      console.log('User signed out.');
    });
  }

function importHash(evt){
  var values;
  var f = this.files[0];
	console.log('file received');
  console.log(f);

//there is a file to read
  if (f){
    console.log("reading file...");
    var reader = new FileReader();
    reader.readAsText(f);

    reader.onload = function(e){
      console.log("result is: " + e.target.result);
      var result = JSON.parse(e.target.result);
      values = result;
      // values.import = true;
      console.log(result);
      console.log(values.length + " of the values are: " + values);

      var request = window.indexedDB.open("auntie_tuna");

      request.onsuccess = function(event) {
        console.log("accessing database ...");
        db = request.result;
      }

      //var transaction = db.transaction("known_good", "readwrite");

      // transaction.oncomplete = function(event){
      //   console.log("...transaction completed");
      // }
      // transaction.onerror = function(event){
      //   console.log("...transaction not opened");
      // }
      //
      // var objectStore = transaction.objectStore("known_good");
      //
      // for(var i = 0; i< values.length; i++){
      //   console.log(values[i]);
      //   console.log(values[i].domain);
      //   var objectStoreRequest = objectStore.add(values[i]);
      //   values[i].import = true;
      //   loadPage(values[i].domain, values[i].hashes, values[i].last_updated, values[i].import);
      //   objectStoreRequest.onsuccess = function(event){
      //     console.log("HASHES imported");
      //   //console.log(values[i].domain + " has been imported to the database");
      //   //loadPage(values[i].domain, values[i].hashes, values[i].last_updated, values[i].import);
      //   }
      //
      // }
		}
	}
}


//database
const dbName = "auntie_tuna";
const dbVer  = 1;
var db = null;

var request = indexedDB.open(dbName, dbVer);
request.onerror = function(event) {
  console.log("pb db > error opening db: " + event.target.errorCode)
};
request.onsuccess = function(event) {
  console.log("pb db > onsuccess");
  db = event.target.result;
}

//not being entered
request.onupgradeneeded = function(event) {
  console.log("pb db > onupgradeneeded");
  // event is an instance of IDBVersionChangeEvent
  db = event.target.result;
  if (db.objectStoreNames.contains('known_good')) {
    db.deleteObjectStore('known_good');
  }

  var store = db.createObjectStore('known_good', { keyPath: "domain" });
  // create indexes
  var domainIndex = store.createIndex("domain", "domain", {unique: true});
  var hashesIndex = store.createIndex("hashes", "hashes", {unique: false, multiEntry: true});

}





document.getElementById('signout').addEventListener('click', signOut);
document.getElementById('import').addEventListener('click', importHash);
