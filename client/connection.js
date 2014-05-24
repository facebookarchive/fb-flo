/**
 *  Copyright (c) 2014, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

(function() {
  'use strict';

  /**
   * Export to node for testing and to global for production.
   */

  if (typeof module === 'object' && typeof exports === 'object') {
    module.exports = Connection;
  } else {
    this.Connection = Connection;
  }

  /**
   * Constants.
   */

  var DELAY = 500;
  var RETRIES = 5;
  var NOP = function () {};

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

  function Connection(host, port, createLogger) {
    this.retries = RETRIES;
    this.host = host;
    this.port = port;
    this.logger = createLogger('connection');
    this.openHandler = this.openHandler.bind(this);
    this.messageHandler = this.messageHandler.bind(this);
    this.closeHandler = this.closeHandler.bind(this);
  }

  /**
   * Callbacks.
   */

  Connection.prototype.callbacks = {
    connecting: NOP,
    message: NOP,
    error: NOP,
    retry: NOP,
    open: NOP
  };

  /**
   * Connect to host.
   *
   * @public
   * @returns {Connection} this
   */

  Connection.prototype.connect = function() {
    var url = 'ws://' + this.host + ':' + this.port + '/';
    var ws = new WebSocket(url);

    this.callbacks.connecting();
    this.logger.log('Connecting to', url);

    ws.onopen = this.openHandler;
    ws.onmessage = this.messageHandler;
    ws.onclose = this.closeHandler;

    this.ws = ws;
    return this;
  };

  /**
   * Registers a message handler.
   *
   * @param {function} callback
   * @param {object} thisObj
   * @return {Connection} this
   * @public
   */

  Connection.prototype.onmessage = makeCallbackRegistrar('message');

  /**
   * Registers an error handler.
   *
   * @param {function} callback
   * @param {object} thisObj
   * @return {Connection} this
   * @public
   */

  Connection.prototype.onerror = makeCallbackRegistrar('error');

  /**
   * Registers a connection handler.
   *
   * @param {function} callback
   * @param {object} thisObj
   * @return {Connection} this
   * @public
   */

  Connection.prototype.onopen = makeCallbackRegistrar('open');

  /**
   * Registers a retry handler.
   *
   * @param {function} callback
   * @param {object} thisObj
   * @return {Connection} this
   * @public
   */

  Connection.prototype.onretry = makeCallbackRegistrar('retry');

  /**
   * Connecting callback
   *
   * @param {function} callback
   * @param {object} thisObj
   * @return {Connection} this
   * @public
   */

  Connection.prototype.onconnecting = makeCallbackRegistrar('connecting');

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

  Connection.prototype.messageHandler = function(evt) {
    var msg = JSON.parse(evt.data);
    this.callbacks.message(msg);
  };


  /**
   * Open handler.
   *
   * @private
   */

  Connection.prototype.openHandler = function() {
    this.logger.log('Connected');
    this.callbacks.open();
    this.retries = RETRIES;
  };


  /**
   * Retries to connect or emits error.
   *
   * @param {object} evt The event that caused the retry.
   * @private
   */

  Connection.prototype.closeHandler = function(evt) {
    this.logger.error('Failed to connect with', evt.reason, evt.code);
    this.retries -= 1;
    if (this.retries < 1) {
      var err = new Error(evt.reason || 'Error connecting.');
      this.callbacks.error(err);
    } else {
      var delay = (RETRIES - this.retries) * DELAY;
      this.logger.log('Reconnecting in ', delay);
      this.callbacks.retry(delay);
      setTimeout(function () {
        this.connect();
      }.bind(this), delay);
    }
  };

  /**
   * Creates a function that registers an event listener when called.
   *
   * @param {string} name
   * @return {function}
   * @private
   */

  function makeCallbackRegistrar(name) {
    return function(cb, context) {
      this.callbacks[name] = cb.bind(context || null);
      return this;
    };
  }

}).call(this);
