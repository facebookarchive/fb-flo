/*global Session:false, logger:false*/
/* jshint evil:true */

(function() {
  'use strict';

  var log = logger('index');
  log('booting');

  chrome.devtools.inspectedWindow['eval'](
    '({ host: location.host, href: location.href })',
    function (result) {
      if (result.host.match(/(?:dev.+|sb)\.facebook\.com/i)) {
        (new Session(result)).start();
      }
    }
  );

})();
