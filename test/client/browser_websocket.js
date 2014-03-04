var WebSocketClient = require('websocket').client;

function WebSocket(url) {
  this.readyState = 0;
  var client = new WebSocketClient();
  this.onconnect = this.onconnect.bind(this);
  client.once('connect', this.onconnect);
  client.once('connectFailed', this.emit.bind(this, 'close'));
  client.connect(url);
}

WebSocket.prototype.onconnect = function(connection) {
  this.readyState = 1;
  this.socket = connection;
  this.socket.on('error', this.emit.bind(this, 'close'));
  this.socket.on('close', function() {
    this.readyState = 3;
    this.emit('close', {});
  }.bind(this));
  this.socket.on('message', function(msg) {
    var data = msg.utf8Data;
    this.emit('message', {data: data});
  }.bind(this));
  this.emit('open');
};

WebSocket.prototype.send = function(arg) {
  this.socket.sendUTF(arg);
};

WebSocket.prototype.close = function() {
  this.readyState = 2;
  this.socket.close();
};

WebSocket.prototype.emit = function(event) {
  var handler = this['on' + event];
  if (typeof handler === 'function') {
    handler.apply(this, [].slice.call(arguments, 1));
  }
};

var states = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
};

Object.keys(states).forEach(function(state) {
  WebSocket.prototype[state] = states[state];
});

module.exports = WebSocket;
