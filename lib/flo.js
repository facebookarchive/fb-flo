'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var Server = require('./server');
var chokidar = require('chokidar');
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

  dir = path.resolve(dir);

  options = options || {};
  options = {
    port: 8888 || options.port,
    host: 'localhost' || options.host,
    verbose: options.verbose || false
  };

  callback = callback || noBuildCallback(dir);

  return new Flo(dir, options, callback);
}

/**
 * Default resolver callback that will simply read the file and pass back the
 * filename relative to the watched dir as the url.
 *
 * @param {string} dir
 * @return {function}
 * @private
 */

function noBuildCallback(dir) {
  return function(filepath, callback) {
    fs.readFile(path.join(dir, filepath), function(err, data) {
      // Todo better error handling.
      if (err) {
        throw err;
      }
      callback({
        resourceURL: filepath,
        contents: data.toString()
      });
    });
  };
}

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
  this.realpathdir = fs.realpathSync(dir);
  this.resolver = callback;
  this.server = new Server({
    port: options.port,
    host: options.host,
    log: logger(options.verbose, 'Server')
  });

  this.watcher = chokidar.watch(dir, { usePolling: false });
  this.watcher.on('change', this.onFileChange.bind(this));
  getReadyEvent(this.watcher, this.emit.bind(this, 'ready'));
}

Flo.prototype.__proto__ = EventEmitter.prototype;

/**
 * Handles file changes.
 *
 * @param {string} filepath
 * @private
 */

Flo.prototype.onFileChange = function(filepath) {
  filepath = fs.realpathSync(filepath);
  filepath = path.relative(this.realpathdir, filepath);
  this.log('File changed', filepath);
  var server = this.server;
  this.resolver(filepath, function(resource) {
    resource = normalizeResource(resource);
    server.broadcast(resource);
  });
};

/**
 * Given a resource, enforce type checks, default params, and prepare for
 * serialization.
 *
 * @param {*} o
 * @return {boolean}
 * @private
 */

function normalizeResource(resource) {
  assert(resource.resourceURL, 'expecting resourceURL');
  assert(resource.contents, 'expecting contents');

  var ret = {};

  ret.match = resource.match || 'indexOf';
  ret.contents = resource.contents;
  ret.resourceURL = resource.resourceURL;

  assert.ok(
    isRegExp(ret.match) ||
      ['indexOf', 'equal'].indexOf(ret.match) > -1,
      'resource.match must be of type function, or regexp, ' +
        'or a string either "indexOf" or "equal'
  );

  if (isRegExp(ret.match)) {
    var r = ret.match;
    ret.match = {
      type: 'regexp',
      source: r.source,
      global: r.global,
      multiline: r.multiline,
      ignoreCase: r.ignoreCase
    };
  }

  return ret;
}

/**
 * Check if an object is of type RegExp.
 *
 * @param {*} o
 * @return {boolean}
 * @private
 */

function isRegExp(o) {
  return o && typeof o === 'object' &&
    Object.prototype.toString.call(o) === '[object RegExp]';
}

/**
 * Closes the server and the watcher.
 *
 * @public
 */

Flo.prototype.close = function() {
  this.log('Shutting down flo');
  this.watcher.close();
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

var DELAY = 200;

/**
 * Get a ready event from chokidar.
 *
 * @param {chokidar.FSWatcher} watcher
 * @param {funciton} callback
 */

function getReadyEvent(watcher, callback) {
  var t;
  function done() {
    watcher.removeListener('add', handler);
    callback();
  }
  function handler() {
    clearTimeout(t);
    t = setTimeout(done, DELAY);
  }
  handler();
  watcher.on('add', handler);
}
