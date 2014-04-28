/**
 *  Copyright (c) 2014, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

var assert = require('assert');
var Connection = require('../../client/connection');
var Server = require('../../lib/server');
var WebSocket = require('./browser_websocket');
var mockLogger = require('./logger_mock');
global.WebSocket = WebSocket;

describe('Connection', function() {
  var port = 8543;
  var server;
  afterEach(function() {
    server.close();
    con.disconnect();
  });

  it('should connect to server', function(done) {
    server = new Server({
      port: port
    });
    con = new Connection('localhost', port, mockLogger)
      .onopen(function() {
        server.broadcast({hi: 1});
      })
      .onmessage(function(msg) {
        assert.deepEqual(msg, {
          hi: 1
        });
        done();
      })
      .onerror(done)
      .connect();
  });

  it('should retry to connect', function(done) {
    con = new Connection('localhost', port, mockLogger)
      .onopen(function() {
        done();
      })
      .onretry(function(){
        server = new Server({
          port: port
        });
      })
      .onerror(done)
      .connect();
  });

});
