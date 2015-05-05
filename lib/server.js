/**
 *  Copyright (c) 2014, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

'use strict';

var http = require('http');
var WSS = require('websocket').server;
var EventEmitter = require('events').EventEmitter;

module.exports = Server;

/**
 * Starts an http server with the given options and attaches a websocket server
 * to it.
 *
 * @class Server
 * @param {object} options
 */

function Server(options) {
  this.log = options.log || function() {};
  this.message = options.message || function() {};
  this.hostname = null;
  this.parent = options.parent;
  this.httpServer = http.createServer(function(req, res) {
    res.writeHead(404);
    res.end();
  });

  this.httpServer.on('listening',function(){
      this.parent.emit('ready');
  }.bind(this));

  this.httpServer.listen(options.port);

  this.wsServer = new WSS({
    httpServer: this.httpServer,
    autoAcceptConnections: false
  });
  this.wsServer.on('request', this.onRequest.bind(this));
  this.connections = [];
}

Server.prototype.__proto__ = EventEmitter.prototype;

/**
 * Request handler.
 *
 * @param {object} req
 * @private
 */

Server.prototype.onRequest = function(req) {
  this.log('Client connected', req.socket.address());
  var ws = req.accept();
  this.connections.push(ws);
  ws.on('message', this.onMessage.bind(this));
  ws.on('close', this.onClose.bind(this, ws));
};

/**
 * Websocket connection close handler.
 *
 * @param {object} ws
 * @private
 */

Server.prototype.onMessage = function(message) {
  var buffer = new Buffer(message.utf8Data, 'base64').toString(message.type);
  var data  = JSON.parse(buffer);
  this.log('Message from the client :', data);
  if(data.action == 'baseUrl'){
    if(this.hostname === null){
      this.hostname = data.url.split('/').slice(0,3).join('/')+'/';
      this.log('Client Hostname :', this.hostname);
    }
  }else {
    this.emit('message', data);
  }
};


/**
 * Websocket connection close handler.
 *
 * @param {object} ws
 * @private
 */

Server.prototype.onClose = function(ws) {
  this.log('Client disconnected', ws.remoteAddress);
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
  if(msg.resourceURL !== undefined){
    if(msg.hostname !== undefined){
      msg.resourceURL = msg.hostname+msg.resourceURL;
    }else{
      msg.resourceURL = this.hostname+msg.resourceURL;
    }
  }
  msg = JSON.stringify(msg);
  this.log('Broadcasting to client', msg);
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
  this.log('Shutting down WebSocket server');
  this.connections = null;
  this.wsServer.shutDown();
  this.httpServer.close();
};
