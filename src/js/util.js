// SPDX-License-Identifier: GPL-3.0-or-later

'use strict';

var util = self.util = self.util || {};

// Credit: Johan Sundström
// http://ecmanaut.blogspot.com/2006/07/encoding-decoding-utf8-in-javascript.html
util.utf8_to_b64 = function(str) { return window.btoa(unescape(encodeURIComponent(str))); }
util.b64_to_utf8 = function(str) { return decodeURIComponent(escape(window.atob(str))); }

// Credit: http://stackoverflow.com/questions/1960473/unique-values-in-an-array
util.unique = function(value, index, self) { return self.indexOf(value) === index;}
