/*global logger:false*/

this.Connection = (function() {
  'use strict';

  var log = logger('connection');
  var NOP = function () {};
  var DELAY = 500;
  var RETRIES = 5;

  function Connection(host) {
    this._retries = RETRIES;
    this.host = host;
  }

  /**
   * Reponsible for connecting and retrying to connect.
   * @api
   * @returns {Connection} this
   */
  Connection.prototype.connect = function() {
    var ws = new WebSocket('ws://' + this.host + ':8888/');
    log('Connecting ...', ws);

    ws.onopen = function () {
      log('Connected');
      (this._openCallback || NOP)();
      this._retries = RETRIES;
    }.bind(this);
    ws.onmessage = this._onMessage.bind(this);
    ws.onclose = this.retry.bind(this);

    this.ws = ws;
    return this;
  };

  /**
   * @api
   * @arg {object} evt The event that caused the retry.
   */
  Connection.prototype.retry = function(evt) {
    log('Failed to connect with %s %s', evt.reason, evt.code);
    if (--this._retries < 1) {
      var err = new Error(evt.reason || 'Error connecting.');
      (this._errCallback || NOP)(err);
    } else {
      var delay = (RETRIES - this._retries) * DELAY;
      log('Reconnecting in ', delay);
      setTimeout(function () {
        this.connect();
      }.bind(this), delay);
    }
  };

  /**
   * Registers a message handler.
   * @api
   * @arg {function} callback
   * @arg {object} thisObj
   * @return {Connection} this
   */
  Connection.prototype.message = function(callback, thisObj) {
    this._msgCallback = callback.bind(thisObj || null);
    return this;
  };

  /**
   * Registers an error handler.
   * @api
   * @arg {function} callback
   * @arg {object} thisObj
   * @return {Connection} this
   */
  Connection.prototype.error = function(callback, thisObj) {
    this._errCallback = callback.bind(thisObj || null);
    return this;
  };

  /**
   * Registers a connection handler.
   * @api
   * @arg {function} callback
   * @arg {object} thisObj
   * @return {Connection} this
   */
  Connection.prototype.open = function(callback, thisObj) {
    this._openCallback = callback.bind(thisObj || null);
    return this;
  };

  /**
   * Disconnects from the server
   * @api
   * @arg {function} callback
   * @return {Connection} this
   */
  Connection.prototype.disconnect = function (callback) {
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
   * @api
   * @return {boolean}
   */
  Connection.prototype.connected = function() {
    return this.ws && this.ws.readyState === this.ws.OPEN;
  };

  /**
   * Message handler.
   * @arg {object} evt
   */
  Connection.prototype._onMessage = function(evt) {
    var msg = JSON.parse(evt.data);
    log('Message', msg);
    (this._msgCallback || NOP)(msg);
  };

  return Connection;
})();
