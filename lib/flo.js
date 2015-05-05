/**
 *  Copyright (c) 2014, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var sane = require('sane');
var assert = require('assert');
var Server = require('./server');
var EventEmitter = require('events').EventEmitter;

module.exports = flo;

/**
 * Top-level API for flo. Defaults params and instantiates `Flo`.
 *
 * @param {string} dir
 * @param {object} options
 * @param {function} callback
 * @return {Flo}
 * @public
 */

function flo(dir, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = null;
  }

  if (typeof dir === 'string') {
    dir = [dir];
  }

  options = options || {};
  options = {
    port: options.port || 8888,
    verbose: options.verbose || false,
    glob: options.glob || [],
    useWatchman: options.useWatchman || false,
    useFilePolling: options.useFilePolling || false,
    pollingInterval: options.pollingInterval,
    watchDotFiles: options.watchDotFiles || false
  };
  
  return new Flo(dir, options, callback);
}

/**
 * Time before we emit the ready event.
 */

var DELAY = 200;

/**
 * Starts the server and the watcher and handles the piping between both and the
 * resolver callback.
 *
 * @param {string} dir
 * @param {object} options
 * @param {function} callback
 * @class Flo
 * @private
 */

function Flo(dir, options, callback) {
  this.log = logger(options.verbose, 'Flo');
  this.dir = dir;
  this.options = options;
  this.resolver = callback;
  this.server = new Server({
    port: options.port,
    log: logger(options.verbose, 'Server'),
    parent : this
  });

  this.server.on('message', this.onMessage.bind(this));

  this.watchers=[];

  this.fileEvent = this.onFileChange.bind(this);

  this.watch();
}

Flo.prototype.__proto__ = EventEmitter.prototype;

/**
 * Handles file changes.
 *
 * @param {string} filepath
 * @private
 */

Flo.prototype.onFileChange = function(filepath,root) {
    filepath = root+'/'+filepath;
    this.log('File changed', filepath);
    var server = this.server;
    this.resolver(filepath);
};


/**
 * Get Client hostname.
 *
 * @public
 */

Flo.prototype.getClientHostname = function() {
    return this.server.hostname;
};


/**
 * Start watching
 *
 * @private
 */
Flo.prototype.watch = function() {
  this.dir.forEach(function(folder){
    this.watchers[folder] = new sane( path.resolve(folder), {
      glob: this.options.glob,
      poll: this.options.useFilePolling,
      interval: this.options.pollingInterval,
      watchman: this.options.useWatchman,
      dot: this.options.watchDotFiles
    });
    this.watchers[folder].on('change', this.fileEvent);
    this.watchers[folder].on('error', this.emit.bind(this, 'error'));
    this.log("start watching ",folder);
  }.bind(this));
};

/**
 * Stop watching
 *
 * @private
 */

Flo.prototype.stopWatching = function(cb) {
    var self = this;
     this.dir.forEach(function(folder){
        this.watchers[folder].close();
        self.log("stop watching ",folder);
    }.bind(this));
     if(cb){
        cb();
    }
};


/**
 * Brodcast a message.
 *
 * @param {object} message
 * @private
 */

Flo.prototype.broadcast = function(message) {
    server.broadcast(message);
};

/**
 * Handles message
 *
 * @param {string} message (charset : base64)
 * @private
 */

Flo.prototype.onMessage = function(message) {
    this.emit(message.action, message);
};

/**
 * Closes the server and the watcher.
 *
 * @public
 */

Flo.prototype.close = function() {
  this.log('Shutting down flo');
  this.stopWatching();
  this.server.close();
};

/**
 * Creates a logger for a given module.
 *
 * @param {boolean} verbose
 * @param {string} moduleName
 * @private
 */

function logger(verbose, moduleName) {
  var slice = [].slice;
  return function() {
    var args = slice.call(arguments);
    args[0] = '[' + moduleName + '] ' + args[0];
    if (verbose) {
      console.log.apply(console, args);
    }
  }
}


