function checkHash(hash) {
  if(obj['hashes'] != null) {
    if(obj['hashes'].indexOf(hash.toString()) != -1) {
      // hash exists on the bad list
      return 1;
    } else {
      return 0;
    }
  } else {
    // shouldn't get here
    console.log("pb> obj[hashes] is null");
  }
}

// XXX should we really keep passing around content like this? should probably
// check if javascript does pass by reference or...?
// TODO should validate regex
// TODO it would be awesome to put a red border around matches!
function chunkAndCheck(regex, content) {

  var m = '';
  var pos_list = [0];
  
  do {
    m = regex.exec(content);
    if (m) {
      //console.log(m['index']);
      pos_list.push(m['index']);
    }
  } while (m);
  
  pos_list.push(content.length);
  
  //console.log(pos_list);
  
  var pos_tuples_list = [];
  
  for( var i = 0; i < pos_list.length - 1; i++ ) {
    pos_tuples_list.push( [ pos_list[i], pos_list[i+1] ] );
  }
  
  //console.log(pos_tuples_list);

  var bad = 0;
  var total = 0;
  
  pos_tuples_list.forEach(function(tuple) {
    var b = tuple[0];
    var e = tuple[1];
    var h = CryptoJS.SHA256( content.substring(b,e) );
 
    var res = checkHash(h);
    if(res == 1) {
      bad = bad + 1;
    } 
    total = total + 1;
    
    if (debug === 1 ) { 
      console.log("pb chunkAndHash> " + tuple + " " + res + " " + h.toString().substring(0,10));
    }
  });

  return { 'bad' : bad, 'total' : total };
}

function hashEverything(content) {

  // TODO whitespace normalization
  var displayWarning = 0;

  // we do chunking by both <p> and <div>
  // TODO benchmarking
  var re_p   = /<[pP][ /\t>]/g;
  var re_div = /<[dD][iI][vV][ /\t>]/g;
  var re_pdiv = /<(([pP])|([dD][iI][vV]))[ /\t>]/g;

  /*console.log("pb hashEverything> chunkAndCheck <p>");
  results_p   = chunkAndCheck(re_p, content);
  //console.log("pb hashEverything> chunkAndCheck <div>");
  results_div = chunkAndCheck(re_div, content);
  console.log("pb hashEverything> <p>   bad: " + results_p['bad']   + ", total: " + results_p['total']);
  console.log("pb hashEverything> <div> bad: " + results_div['bad'] + ", total: " + results_div['total']);

  var bad = results_p['bad'] + results_div['bad'];
  var total = results_p['total'] + results_div['total']; //*/

  results_pdiv = chunkAndCheck(re_pdiv, content);
  var bad = results_pdiv['bad'];
  var total = results_pdiv['total'];
  console.log("pb hashEverything> bad: " + bad + ", total: " + total);

  // TODO adjust the threshold
  if(bad > 0) { displayWarning = 1; }

  // display an overlay warning user of phish
  if(displayWarning == 1 || debug == 1) {

    // XXX this is horrendous code, but it works.

    // following text is from Google
    var text = "<strong>Warning—Suspected phishing page.</strong> This page may be a forgery or imitation of another website, designed to trick users into sharing personal or financial information. Entering any personal information on this page may result in identity theft or other abuse. You can find out more about phishing from www.antiphishing.org."
    
    var inject = document.createElement("div");
    inject.setAttribute('id', 'pb-warning');
    inject.setAttribute('style', ' '
      + 'font-family: Helvetica;'
      + 'font-size: 18pt;'
      + 'width: 50%;'
      + 'margin: auto;'
      + 'padding-top: auto;'
      + 'padding-bottom: auto;'
      + 'color: #fff;' 
      + 'width: 100%;'
      + 'height: 100%;'
      + 'display: table;'
      + 'top: 0; left: 0; z-index: 10; '
      + 'position: absolute; background-color: rgba(0, 0, 0, 0.6);'
      );

    var text_debug = '<br><br><span style="font-size: 12pt; font-family: Monospace">(p) debug: ' + debug 
      + ', bad: ' + bad + ', total: ' + total
      + ', badness ratio: ' + bad/total + '</span>';

    /*
    var text_debug_p = '<br><br><span style="font-size: 12pt; font-family: Monospace">(p) debug: ' + debug 
      + ', bad: ' + results_p['bad'] + ', total: ' + results_p['total'] 
      + ', badness ratio: ' + results_p['bad']/results_p['total'] + '</span>';

    var text_debug_div = '<br><br><span style="font-size: 12pt; font-family: Monospace">(div) debug: ' + debug 
      + ', bad: ' + results_div['bad'] + ', total: ' + results_div['total'] 
      + ', badness ratio: ' + results_div['bad']/results_div['total'] + '</span>';*/

    var buttons = '<br><br><button type="button" onclick="document.getElementById(\'pb-warning\').style.display = \'none\';">Continue Anyways</button>'
      + '<button type="button" onclick="window.history.back()">Back to Safety</button>';

    text = text + (debug ? text_debug : '') + buttons;

    inject.innerHTML = ''
      + '<div style="display: table-cell; vertical-align: middle;">' 
      + '<div style="padding: 3em; margin-left: auto; margin-right: auto; width: 60%; border: 1px solid black; background-color: rgba(191,33,22,1);">' 
      + text + '</div></div>';

    // debug, but bad = 0
    if(displayWarning == 0 && debug == 1) {
      inject.innerHTML = text_debug_p + text_debug_div + buttons;
    }

    // the actual injection of the html
    document.body.insertBefore(inject, document.body.firstChild);
  } // end if badness > 0
} // end hashEverything

// main: start execution from here
console.log("pb contentscript-end> begin: " + location.href);

var obj = obj || {};
obj['ready'] = 0;
obj['hashes'] = null;
var storage = chrome.storage.local;
var debug = 0;

console.log('pb debug> shouldrun? ' + shouldRun);
if(shouldRun == 1 || debug == 1) {

  storage.get(obj, function(items) {
    console.log("pb> obj[ready] = " + items['ready'] + ", obj[hashes].length = " + items['hashes'].length);
  
    if(items['ready'] == 1) {
  
      // set our object
      obj['ready'] = items['ready'];
      obj['hashes'] = items['hashes'];
  
      // get raw html for location.href
      var xhr = new XMLHttpRequest();
      xhr.open("GET", location.href, true);
      xhr.onreadystatechange = function() {
        // 4: request finished and response is ready
        if (xhr.readyState == 4) {
          var content = xhr.responseText;
          // if successful, process the raw HTML
          // TODO what if the page is very large?
          hashEverything(content);
        }
      }
      xhr.send();
  
    } else {
      // object cache hasn't been stored in local yet
      // TODO wait for background.js to reinject this script
      console.log("pb> not ready yet");
    }
  }); // end storage.get callback
} // end shouldRun
// end main

console.log("pb contentscript-end> end");
