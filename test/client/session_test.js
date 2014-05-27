/**
 *  Copyright (c) 2014, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

var assert = require('assert');
var Server = require('../../lib/server');
var Session = require('../../client/session');
var WebSocket = require('./browser_websocket')
var Connection = require('../../client/connection');
var mockLogger = require('./logger_mock');

global.Connection = Connection;
global.WebSocket = WebSocket;

var nop = function() {};

describe('Session', function() {

  beforeEach(function() {
    this.server = new Server({ port: port });
    global.chrome = {
      devtools: {
        inspectedWindow: {
          getResources: function(callback) {
            callback();
          },
          onResourceAdded: {
            addListener: nop,
            removeListener: nop
          }
        },
        network: {
          onNavigated: {
            addListener: nop,
            removeListener: nop
          }
        }
      },
    };
  });
  afterEach(function() {
    this.server.close();
    this.session.destroy();
  });

  var port = 8543;
  it('should start', function(done) {
    var i = 0;
    function status(state) {
      if (++i == 1) {
        assert.equal(state, 'connecting');
      } else if (i == 2) {
        assert.equal(state, 'connected');
      } else {
        assert.equal(state, 'started');
        done();
      }
    }
    this.session = new Session('localhost', port, status, mockLogger);
    this.session.start();
  });

  it('should clean properly', function() {
    var status = function(state) {
      if (state !== 'started') return;
      var called = 0;
      chrome.devtools.inspectedWindow.onResourceAdded.removeListener =
      chrome.devtools.network.onNavigated.removeListener =
        function() { called++; };

      this.session.destroy(function() {
        assert(!this.server.connections.length);
        assert.equal(called, 2);
      }.bind(this));
    }.bind(this);

    this.session = new Session('localhost', port, status, mockLogger);
    this.session.start();
  });

  describe('resource manipulation', function() {
    beforeEach(function() {
      chrome.devtools.inspectedWindow.getResources = function(callback) {
        callback([{
          url: 'http://wat',
          setContent: function() {
            this.setContent.apply(this, arguments)
          }.bind(this)
        }]);
      }.bind(this);
      this.session = new Session('localhost', port, function(state) {
        if (state === 'started') this.started();
      }.bind(this), mockLogger);
      this.session.start();
    });

    it('should change resources using equal matcher', function(done) {
      this.started = function() {
        this.server.broadcast({
          resourceURL: 'http://wat',
          match: 'equal',
          contents: 'foo'
        });
      }.bind(this);
      this.setContent = function(contents, callback) {
        assert.equal(contents, 'foo');
        done();
      };
    });

    it('should change resource using regexp matcher', function(done) {
      this.started = function() {
        this.server.broadcast({
          resourceURL: 'http://wat',
          match: {
            type: 'regexp',
            source: 'waT',
            ignoreCase: true
          },
          contents: 'foo'
        });
      }.bind(this);

      this.setContent = function(contents, callback) {
        assert.equal(contents, 'foo');
        done();
      };
    });

    it('should change resource using regexp matcher', function(done) {
      this.started = function() {
        this.server.broadcast({
          resourceURL: 'http://wat',
          match: {
            type: 'regexp',
            source: 'waT',
            ignoreCase: true
          },
          contents: 'foo'
        });
      }.bind(this);

      this.setContent = function(contents, callback) {
        assert.equal(contents, 'foo');
        done();
      };
    });

    it('should change resource using indexOf matcher', function(done) {
      this.started = function() {
        this.server.broadcast({
          resourceURL: 'http://w',
          match: 'indexOf',
          contents: 'foo'
        });
      }.bind(this);

      this.setContent = function(contents, callback) {
        assert.equal(contents, 'foo');
        done();
      };
    });

    it('should trigger an event when matched', function(done) {
      chrome.devtools.inspectedWindow.eval = function(expr) {
        assert(expr.match(/var event = new Event\('fb-flo-reload'\);/),
          "event creation");
        assert(expr.match(/event.data = \{"url":"http:\/\/w","contents":"foo"}/),
          "event data");
        assert(expr.match(/window.dispatchEvent\(event\);/),
          "event dispatch");
        done();
      };

      this.setContent = function(contents, bool, callback) {
        callback({ code: 'OK' });
      };

      this.started = function() {
        this.server.broadcast({
          resourceURL: 'http://w',
          match: 'indexOf',
          contents: 'foo'
        });
      }.bind(this);
    });
  });

});
