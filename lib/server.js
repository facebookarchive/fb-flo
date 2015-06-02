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
  this.pageUrl = null;
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
  if(this.hostname === null){
      this.broadcast({
        action : 'baseUrl'
      });
  }
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
  this.log('Message from the client :', data.action, data.url);
//  this.log('Message from the client :', data);
  if(data.action == 'baseUrl'){
    var url = data.url.split('/');
    this.hostname = url.slice(0,3).join('/')+'/';
    this.pageUrl = url.slice(3).join('/');
    this.log('Client Url :', this.pageUrl);
    this.log('Client Hostname :', this.hostname);
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
 * Broadcast a message to the Client.
 *
 * @param {object} msg
 * @public
 */

Server.prototype.broadcast = function(msg) {
  if(msg.resourceURL !== undefined){
    if(msg.resourceURL[0] == '/'){
      msg.resourceURL = msg.resourceURL.substr(1);
    }

    var hostname = this.hostname;
    if(msg.hostname !== undefined){
      hostname = msg.hostname;
    }

    if(hostname[hostname.length-1] == '/'){
      hostname = hostname.substr(0,hostname.length-1);
    }

    msg.resourceURL = hostname+'/'+msg.resourceURL;

    this.log('broadcast', msg.resourceURL);
  }

  this.sendMessage(msg);
};

/**
 * Broadcast a message to the Client.
 *
 * @param {object} msg
 * @private
 */

Server.prototype.sendMessage = function(msg) {

  this.log('sendMessage', msg.resourceURL);
  if(msg.content !== undefined && msg.content.length >= 50000){
    //send message by part
    var content = msg.content;
    delete msg.content;
    this.connections.forEach(function(ws) {
        msg.part = content.substr(0,50000);
        ws.send(JSON.stringify(msg));
        delete msg.part;
        msg.content = content.substr(50000);
        this.sendMessage(msg);
    }.bind(this));
  }else{
    // send full message
    this.connections.forEach(function(ws) {
        ws.send(JSON.stringify(msg));
    });
  }
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
