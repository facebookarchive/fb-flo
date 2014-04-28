/**
 *  Copyright (c) 2014, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

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
