/* jshint evil:true */

this.logger = (function() {
  'use strict';

  function logger(namespace) {
    return function() {
      var args = [].slice.call(arguments);
      args[0] = '[flo][' + namespace + ']' + args[0];
      return console.log.apply(console, args);
    };
  }

  logger.logInContext = function(arg, method) {
    if (!method) {
      method = 'log';
    }
    chrome.devtools.inspectedWindow['eval'](
      'console.' + method + '("' + arg.toString() + '")'
    );
  };

  return logger;
})();
