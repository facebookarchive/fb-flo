var assert = require('assert');
var Connection = require('../connection');
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
      .open(function() {
        server.broadcast({hi: 1});
      })
      .message(function(msg) {
        assert.deepEqual(msg, {
          hi: 1
        });
        done();
      })
      .error(done)
      .connect();
  });

  it('should retry to connect', function(done) {
    con = new Connection('localhost', port, mockLogger)
      .open(function() {
        done();
      })
      .retry(function(){
        server = new Server({
          port: port
        });
      })
      .error(done)
      .connect();
  });

});
