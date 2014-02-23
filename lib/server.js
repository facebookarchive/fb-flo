'use strict';

var http = require('http');
var WSS = require('websocket').server;

module.exports = Server;

/**
 * Starts an http server with the given options and attaches a websocket server
 * to it.
 *
 * @class Server
 * @param {object} options
 */

function Server(options) {
  this.httpServer = http.createServer(function(req, res) {
    res.writeHead(404);
    res.end();
  });
  this.httpServer.listen(options.port);
  this.wsServer = new WSS({
    httpServer: this.httpServer,
    autoAcceptConnections: false
  });
  this.wsServer.on('request', this.onRequest.bind(this));
  this.connections = [];
}

/**
 * Request handler.
 *
 * @param {object} req
 * @private
 */

Server.prototype.onRequest = function(req) {
  console.log('client connected');
  var ws = req.accept();
  this.connections.push(ws);
  ws.on('close', this.onClose.bind(this, ws));
};

/**
 * Websocket connection close handler.
 *
 * @param {object} ws
 * @private
 */

Server.prototype.onClose = function(ws) {
  if (this.connections) {
    this.connections.splice(this.connections.indexOf(ws), 1);
  }
};

/**
 * Message handler.
 *
 * @param {object} msg
 * @public
 */

Server.prototype.broadcast = function(msg) {
  msg = JSON.stringify(msg);
  this.connections.forEach(function(ws) {
    ws.send(msg);
  });
};

/**
 * Close the server.
 *
 * @public
 */

Server.prototype.close = function() {
  this.connections = null;
  this.wsServer.shutDown();
  this.httpServer.close();
};
