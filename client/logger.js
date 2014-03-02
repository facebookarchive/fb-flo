/* jshint evil:true */

this.Logger = (function() {
  'use strict';

  function Logger(log) {
    return function(namespace) {
      return function() {
        var args = [].slice.call(arguments);
        args[0] = '[' + namespace + '] ' + args[0];
        return log(args);
      }
    };
  }

  Logger.logInContext = function(arg, method) {
    if (!method) {
      method = 'log';
    }
    chrome.devtools.inspectedWindow['eval'](
      'console.' + method + '("' + arg.toString() + '")'
    );
  };

  return Logger;
})();
