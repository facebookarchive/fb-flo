var fs = require('fs');
var flo = require('../');
var assert = require('assert');
var WebSocketClient = require('websocket').client;

describe('flo(dir)', function() {
  var client, f;

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

  it('should start a server', function(done) {
    f = flo('/tmp/flo_test');
    f.on('added', console.log)
    f.on('ready', function () {
      client = new WebSocketClient();
      client.connect('ws://localhost:8888/');
      client.on('connect', done.bind(null, null));
      client.on('connectFailed', done.bind(null, new Error('Failed to connect')));
    });
  });

  it('should send resource to the client when changed', function(done) {
    f = flo('/tmp/flo_test');
    f.on('ready', function () {
      client = new WebSocketClient();
      client.connect('ws://localhost:8888/');
      client.on('connectFailed', done.bind(null, new Error('Failed to connect')));
      client.on('connect', function (connection) {
        connection.on('message', function(msg) {
          var data = msg.utf8Data;
          var msg = JSON.parse(data);
          assert.deepEqual(msg, {
            contents: 'alert("hi")',
            resourceURL: 'foo.js'
          });
          done();
        });
      });
      fs.writeFileSync('/tmp/flo_test/foo.js', 'alert("hi")');
    });
  });

  it('should send resource to multiple clients when changed', function(done) {
    f = flo('/tmp/flo_test');
    f.on('ready', function () {
      client = new WebSocketClient();
      var client2 = new WebSocketClient();
      client2.connect('ws://localhost:8888/');
      client.connect('ws://localhost:8888/');
      client.on('connectFailed', done.bind(null, new Error('Failed to connect')));
      client2.on('connectFailed', done.bind(null, new Error('Failed to connect')));

      var i = 0;
      function handler(connection) {
        connection.on('message', function(msg) {
          var data = msg.utf8Data;
          var msg = JSON.parse(data);
          assert.deepEqual(msg, {
            contents: 'alert("hi")',
            resourceURL: 'foo.js'
          });
          if (++i == 2) {
            done();
          } else {
            // make sure we handle disconnects.
            connection.close();
          }
        });
      }
      client.on('connect', handler);
      client2.on('connect', handler);
      fs.writeFileSync('/tmp/flo_test/foo.js', 'alert("hi")');
    });
  });

});
