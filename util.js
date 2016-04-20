var util = self.util = self.util || {};

// Credit: Johan Sundström
// http://ecmanaut.blogspot.com/2006/07/encoding-decoding-utf8-in-javascript.html
util.utf8_to_b64 = function(str) { return window.btoa(unescape(encodeURIComponent(str))); }
util.b64_to_utf8 = function(str) { return decodeURIComponent(escape(window.atob(str))); }
