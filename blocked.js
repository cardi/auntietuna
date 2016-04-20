(function() {

// parse out data in URL
var d = /data=([^&]+)/.exec(window.location.search);
var data = null;
if (d != null) {
  //console.log(d[1]);
  try {
    data = JSON.parse(util.b64_to_utf8(d[1]));
    console.log(data);
    console.log(data.suggested);
  } catch (e) {
    console.log("pb blocked > error decoding JSON");
  }
}

// suggest the intended destination to a user
if (data != null) {
  if (data.debugMode == 1) {
    document.getElementById('click_adv').textContent =
      (document.getElementById('click_adv').textContent).concat(" [currently running in debug mode]");
  }

  if (data.hits == 0 || Object.keys(data.suggested).length == 0) {
    // likely we're in 'debug' mode
    document.getElementById('suggested').textContent = "[in debug mode]";
    console.log(data);
  } else {
    // look through the domains we've gotten matches from and suggest the one
    // with the largest number of matches
    var max = 0, bestDomain = "", key;
    for ( key in data.suggested ) {
      if ( (data.suggested)[key] > max ) {
        max = (data.suggested)[key];
        bestDomain = key;
      }
    }
    document.getElementById('suggested').setAttribute("href", key);
    document.getElementById('suggested').textContent = key;
  }
}

// eventListener: "advanced"
var adv_visible = false;
document.getElementById('click_adv').addEventListener('click', 
  function() { 
    if (!adv_visible) {
      adv_visible = true;
      document.getElementById('arrow').innerHTML = "&#9662;";
      var p = document.getElementById('text_adv');
      // TODO have to go back to site while _temporarily_ disabling phish detection
      p.innerHTML = '<a href="#">I understand the risks, let me proceed on.</a> (not implemented yet)';
    } else {
      adv_visible = false;
      document.getElementById('arrow').innerHTML = "&#9656;";
      var p = document.getElementById('text_adv');
      p.innerHTML = '';
    }
  }); 

// eventListener: "back to safety"
//
// going back once leads us back to the phish, regenerating an alert
//
if (window.history.length > 2) {
  document.getElementById('back').addEventListener('click', function() { window.history.go(-2); }); 
} else {
  document.getElementById('back').addEventListener('click', function() { window.close(); }); 
}

})();
