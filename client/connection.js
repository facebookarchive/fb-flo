/*global logger:false*/

(function() {
  'use strict';
  var NOP = function () {};
  var DELAY = 500;
  var RETRIES = 5;

  /**
   * Takes care of connecting, messaging, handling connection retries with the
   * flo server.
   *
   * @param {string} host
   * @param {string} port
   * @param {object} logger
   * @class Connection
   * @public
   */

  function Connection(host, port, logger) {
    this._retries = RETRIES;
    this.host = host;
    this.port = port;
    this.log = logger('connection');
  }

  /**
   * Connect to host.
   *
   * @public
   * @returns {Connection} this
   */

  Connection.prototype.connect = function() {
    var url = 'ws://' + this.host + ':' + this.port + '/';
    var ws = new WebSocket(url);
    (this._connectingCallback || NOP)();
    this.log('Connecting to', url);

    ws.onopen = function () {
      this.log('Connected');
      (this._openCallback || NOP)();
      this._retries = RETRIES;
    }.bind(this);
    ws.onmessage = this._onMessage.bind(this);
    ws.onclose = this._retry.bind(this);

    this.ws = ws;
    return this;
  };

  /**
   * Retry to connect.
   *
   * @param {object} evt The event that caused the retry.
   */

  Connection.prototype._retry = function(evt) {
    this.log('Failed to connect with', evt.reason, evt.code);
    if (--this._retries < 1) {
      var err = new Error(evt.reason || 'Error connecting.');
      (this._errCallback || NOP)(err);
    } else {
      var delay = (RETRIES - this._retries) * DELAY;
      this.log('Reconnecting in ', delay);
      (this._retryCallback || NOP)(delay);
      setTimeout(function () {
        this.connect();
      }.bind(this), delay);
    }
  };

  /**
   * Registers a message handler.
   *
   * @param {function} callback
   * @param {object} thisObj
   * @return {Connection} this
   * @public
   */

  Connection.prototype.message = function(callback, thisObj) {
    this._msgCallback = callback.bind(thisObj || null);
    return this;
  };

  /**
   * Registers an error handler.
   *
   * @param {function} callback
   * @param {object} thisObj
   * @return {Connection} this
   * @public
   */

  Connection.prototype.error = function(callback, thisObj) {
    this._errCallback = callback.bind(thisObj || null);
    return this;
  };

  /**
   * Registers a connection handler.
   *
   * @param {function} callback
   * @param {object} thisObj
   * @return {Connection} this
   * @public
   */

  Connection.prototype.open = function(callback, thisObj) {
    this._openCallback = callback.bind(thisObj || null);
    return this;
  };

  /**
   * Registers a retry handler.
   *
   * @param {function} callback
   * @param {object} thisObj
   * @return {Connection} this
   * @public
   */

  Connection.prototype.retry = function(callback, thisObj) {
    this._retryCallback = callback.bind(thisObj || null);
    return this;
  };


  /**
   * Connecting callback
   *
   * @param {function} callback
   * @param {object} thisObj
   * @return {Connection} this
   * @public
   */

  Connection.prototype.connecting = function(callback, thisObj) {
    this._connectingCallback = callback.bind(thisObj || null);
    return this;
  };

  /**
   * Disconnects from the server
   *
   * @param {function} callback
   * @return {Connection} this
   * @public
   */

  Connection.prototype.disconnect = function (callback) {
    callback = callback || NOP;
    if (this.connected()) {
      this.ws.onclose = callback;
      this.ws.close();
    } else {
      callback();
    }
    return this;
  };

  /**
   * Are we connected?
   *
   * @public
   * @return {boolean}
   */

  Connection.prototype.connected = function() {
    return this.ws && this.ws.readyState === this.ws.OPEN;
  };

  /**
   * Message handler.
   *
   * @param {object} evt
   * @private
   */

  Connection.prototype._onMessage = function(evt) {
    var msg = JSON.parse(evt.data);
    (this._msgCallback || NOP)(msg);
  };

  /**
   * Export to node for testing and to global for production.
   */

  if (typeof module === 'object' && typeof exports === 'object') {
    module.exports = Connection;
  } else {
    this.Connection = Connection;
  }

}).call(this);
