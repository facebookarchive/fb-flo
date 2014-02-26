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
  this.realpathdir = fs.realpathSync(dir);
  this.resolver = callback;
  this.server = new Server({
    port: options.port,
    host: options.host,
    log: logger(options.verbose, 'Server')
  });

  this.watcher = sane(dir);
  this.watcher.on('change', this.onFileChange.bind(this));
  this.watcher.on(
    'ready',
    this.emit.bind(this, 'ready')
  );
}

Flo.prototype.__proto__ = EventEmitter.prototype;

/**
 * Handles file changes.
 *
 * @param {string} filepath
 * @private
 */

Flo.prototype.onFileChange = function(filepath) {
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
