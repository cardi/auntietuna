console.log("pb contentscript-start> begin");

// TODO load whitelist from a resource
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
var whitelisted_urls = ['https://www.paypal.com/', 'https://www.isi.edu/'];

// check if `location.href` exists in whitelist
// (note that if debug == 1 in contentscript-end.js, hash checking will still run)
// TODO optimize
whitelisted_urls.forEach(function(url) {

  // 
  // check if a whitelisted URL is at the *beginning* of `location.href`
  //
  //   good: http://www.paypal.com/
  //   bad:  http://www.paypal.com.bad.website.that.uses.subdomains.com/login
  //
  // XXX are there any other href trickeries that could be done?

  // e.g. "https://www.paypal.com/home" indexOf ( "https://www.paypal.com/" )
  // should only be 0 in order to match the whitelist
  // TODO extract the base domain using some Chrome API
  if(location.href.indexOf(url) === 0) {
    shouldRun = 0;
  }

});

console.log("pb contentscript-start> timestamp: " + Date.now() + ", shouldrun: " + shouldRun + ", whitelist index: " + whitelisted_urls.indexOf(location.href) + " website: " + location.href);

console.log("pb contentscript-start> end");
