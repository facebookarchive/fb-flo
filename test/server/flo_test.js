/**
 *  Copyright (c) 2014, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

var fs = require('fs');
var flo = require('../../');
var assert = require('assert');
var WebSocketClient = require('websocket').client;

function client(connectFailed, connect, message) {
  var client = new WebSocketClient();
  client.connect('ws://localhost:8888/');
  client.on('connectFailed', connectFailed);
  client.on('connect', function (connection) {
    if (connect) connect(connection);
    connection.on('message', function (msg) {
      var data = msg.utf8Data;
      data = JSON.parse(data);
      if (message) message(data);
    });
  });
  return client;
}

describe('flo(dir)', function() {
  var f;

  beforeEach(function(done) {
    try {
      fs.mkdirSync('/tmp/flo_test');
    } catch (e) {
      // don't care
    }

    fs.writeFileSync('/tmp/flo_test/foo.js', 'alert("wow")');
    setTimeout(done, 300);
  });

  afterEach(function() {
    f.close();
  });

  it('should start a server', function(done) {
    f = flo('/tmp/flo_test');
    f.on('added', console.log)
    f.on('ready', function () {
      var c = client(
        done.bind(null, new Error('Failed to connect')),
        done.bind(null, null)
      );
    });
  });

  it('should send resource to the client when changed', function(done) {
    f = flo('/tmp/flo_test');
    f.on('ready', function () {
      var c = client(
        done.bind(null, new Error('Failed to connect')),
        null,
        function (msg) {
          assert.deepEqual(msg, {
            contents: 'alert("hi")',
            resourceURL: 'foo.js',
            match: 'indexOf'
          });
          done();
        }
      );
      fs.writeFileSync('/tmp/flo_test/foo.js', 'alert("hi")');
    });
  });

  it('should work with css', function(done) {
    fs.writeFileSync('/tmp/flo_test/bar.css', 'bar {color: red}');
    f = flo('/tmp/flo_test');
    f.on('ready', function () {
      var c = client(
        done.bind(null, new Error('Failed to connect')),
        null,
        function(msg) {
          assert.deepEqual(msg, {
            contents: 'bar {color: blue}',
            resourceURL: 'bar.css',
            match: 'indexOf'
          });
          done();
        }
      );
      fs.writeFileSync('/tmp/flo_test/bar.css', 'bar {color: blue}');
    });
  });

  it('should send resource to multiple clients when changed', function(done) {
    f = flo('/tmp/flo_test');
    f.on('ready', function () {
      var i = 0;
      function handler(connection) {
        connection.on('message', function(msg) {
          var data = msg.utf8Data;
          var msg = JSON.parse(data);
          assert.deepEqual(msg, {
            contents: 'alert("hi")',
            resourceURL: 'foo.js',
            match: 'indexOf'
          });
          if (++i == 2) {
            done();
          } else {
            // make sure we handle disconnects.
            connection.close();
          }
        });
      }

      var c1 = client(
        done.bind(null, new Error('Failed to connect')),
        handler
      );
      var c2 = client(
        done.bind(null, new Error('Failed to connect')),
        handler
      );

      fs.writeFileSync('/tmp/flo_test/foo.js', 'alert("hi")');
    });
  });
});

 describe('flo(dir, resolver)', function() {
  var f;

  beforeEach(function() {
    try {
      fs.mkdirSync('/tmp/flo_test');
    } catch (e) {
      // don't care
    }

    fs.writeFileSync('/tmp/flo_test/foo.js', 'alert("wow")');
  });

  afterEach(function() {
    f.close();
  });

  it('should work with a custom resolver', function(done) {
    f = flo('/tmp/flo_test', function (filepath, callback) {
      assert.equal(filepath, 'foo.js');
      callback({
        contents: 'foobar',
        resourceURL: 'customurl'
      });
    });

    f.on('ready', function() {
      var c = client(
        done.bind(null, new Error('Failed to connect')),
        null,
        function(msg) {
          assert.deepEqual(msg, {
            contents: 'foobar',
            resourceURL: 'customurl',
            match: 'indexOf'
          });
          done();
        }
      );

      fs.writeFileSync('/tmp/flo_test/foo.js', 'hmmmm');
    });
  });

  describe('resolver match property', function() {
    it('should serialize regexp objects', function(done) {
      f = flo('/tmp/flo_test', function (filepath, callback) {
        assert.equal(filepath, 'foo.js');
        callback({
          contents: 'foobar',
          resourceURL: 'customurl',
          match: /a(b)+/gi
        });
      });

      f.on('ready', function() {
        var c = client(
          done.bind(null, new Error('Failed to connect')),
          null,
          function(msg) {
            assert.deepEqual(msg, {
              contents: 'foobar',
              resourceURL: 'customurl',
              match: {
                type: 'regexp',
                global: true,
                ignoreCase: true,
                multiline: false,
                source: 'a(b)+'
              }
            });
            done();
          }
        );

        fs.writeFileSync('/tmp/flo_test/foo.js', 'hmmmm');
      });
    });
  });
});
