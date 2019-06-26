console.log("pb cs-start > begin");

var chrome = self.chrome;
var storage = chrome.storage.local;

// XXX whitelisting needs to be done carefully
//
// checking for the existence of "paypal.com" inside the URL is _not_
// correct--quite a few phish will have "paypal.com" or some other variant as a
// subdomain to trick users
//
// XXX another way to whitelist URLs would be to check the SSL cert details
// if your CA trust store is compromised, then SSL cert checking is moot 
//
// unfortunately getting access to SSL cert details won't be a feature in google chrome 
// we'll have to trust that `location.href` gives us the actual location
//
// http://stackoverflow.com/questions/18689724/get-fingerprint-of-current-pages-ssl-certificate-in-a-chrome-extension
// https://code.google.com/p/chromium/issues/detail?id=107793

var shouldRun = 1;
var shouldCrawl = 0;
var whitelisted_domains = [];

// XXX possible race condition if our storage.get takes too long
storage.get('whitelist', function(items) {
  whitelisted_domains = items['whitelist'];
  console.debug("pb whitelist > " + whitelisted_domains);

  // have to put this in the callback because storage.get async  
  // document.domain, window.location.host, window.location.hostname
  //
  // TODO subdomains vs. domains: www.paypal.com vs. paypal.com
  //
  if(whitelisted_domains.indexOf(document.domain) != -1) {
    console.log("pb cs-start > domain in whitelist => *not* running checks");
    shouldRun = 0; 

    // opportunistic recrawl
    // check when and compare to the last crawl time
    // then set a variable and recrawl (in contentscript-end after document_ready)
    chrome.runtime.sendMessage(
      {action: "check_and_recrawl", domain: document.domain}, 
      function(response) {
        if (chrome.runtime.lastError) {
          console.log("pb cs-start recrawl > error in request: " + chrome.runtime.lastError.message);
        }
        if (response.msg === null) {
          console.log("pb cs-start recrawl > response.msg is null, continuing...");
        }

        var today = new Date(Date.now());
        var last_crawled = new Date(response.msg);
        var diff = Math.abs(today - last_crawled); // results in ms

        console.debug("pb cs-start response > " + response.msg + " diff: " + diff);

        // 12096e5 == 14 days
        if ( diff > 12096e5 ) {
          shouldCrawl = 1;
        }
      });
  } else {
    console.log("pb cs-start > domain *not* in whitelist => running checks");
    shouldRun = 1;
  }

  // debugging information
  console.debug(
    ("pb cs-start > "
      + "timestamp: " + Date.now()
      + ", shouldRun: " + shouldRun
      + ", shouldCrawl: " + shouldCrawl
      + ", whitelist index: " + whitelisted_domains.indexOf(document.domain)
      + ", website: " + location.href
      + ", domain: " + document.domain));
});

console.log("pb cs-start > end");
