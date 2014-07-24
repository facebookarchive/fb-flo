/**
 *  Copyright (c) 2014, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

/*global Connection:false */

(function () {
  'use strict';

  /**
   * Export to Node for testing and to global for production.
   */

  if (typeof module === 'object' && typeof exports === 'object') {
    module.exports = Session;
  } else {
    this.Session = Session;
  }

  /**
   * Manages a user sessios.
   *
   * @param {string} host
   * @param {number} port
   * @param {function} status
   * @param {function} logger
   * @class Session
   * @public
   */

  function Session(host, port, status, createLogger) {
    this.host = host;
    this.port = port;
    this.status = status;
    this.createLogger = createLogger;
    this.logger = createLogger('session');
    this.resources = null;
    this.conn = null;
    this.listeners = {};
    this.messageHandler = this.messageHandler.bind(this);
    this.started = this.started.bind(this);
  }

  /**
   * Registers the resources, connects to server and listens to events.
   *
   * @public
   */

  Session.prototype.start = function() {
    this.logger.log('Starting flo for host', this.host);
    this.getResources(this.connect.bind(this, this.started));
  };

  /**
   * Similar to restart but does only what's needed to get flo started.
   *
   * @public
   */

  Session.prototype.restart = function() {
    this.logger.log('Restarting');
    this.removeEventListeners();
    if (this.conn.connected()) {
      // No need to reconnect. We just refetch the resources.
      this.getResources(this.started.bind(this));
    } else {
      this.start();
    }
  };

  /**
   * This method takes care of listening to events defined by the chrome api
   * @see http://developer.chrome.com/extensions/events
   * We also keep an internal map of events we're listening to so we can
   * unsubscribe in the future.
   *
   * @param {object} object
   * @param {string} event
   * @param {function} listener
   * @private
   */

  Session.prototype.listen = function(obj, event, listener) {
    listener = listener.bind(this);
    obj[event].addListener(listener);
    this.listeners[event] = {
      obj: obj,
      listener: listener
    };
  };


  /**
   * Remove all event listeners.
   *
   * @private
   */

  Session.prototype.removeEventListeners = function() {
    Object.keys(this.listeners).forEach(function(event) {
      var desc = this.listeners[event];
      desc.obj[event].removeListener(desc.listener);
    }, this);
  };

  /**
   * Registers the resources and listens to onResourceAdded events.
   *
   * @param {function} callback
   * @private
   */

  Session.prototype.getResources = function(callback) {
    var self = this;
    chrome.devtools.inspectedWindow.getResources(function (resources) {
      self.resources = resources;
      // After we register the current resources, we listen to the
      // onResourceAdded event to push on more resources lazily fetched
      // to our array.
      self.listen(
        chrome.devtools.inspectedWindow,
        'onResourceAdded',
        function (res) {
          self.resources.push(res);
        }
      );
      callback();
    });
  };

  /**
   * Connect to server.
   *
   * @param {function} callback
   * @private
   */

  Session.prototype.connect = function(callback) {
    callback = once(callback);
    var self = this;
    this.conn = new Connection(this.host, this.port, this.createLogger)
      .onmessage(this.messageHandler)
      .onerror(function () {
        self.status('error');
      })
      .onopen(function () {
        self.status('connected');
        callback();
      })
      .onretry(function(delay) {
        self.status('retry', delay);
      })
      .onconnecting(function() {
        self.status('connecting');
      })
      .connect();
  };

  /**
   * Does whatever needs to be done after the session is started. Currenlty
   * just listening to page refresh events.
   *
   * @param {function} callback
   */

  Session.prototype.started = function() {
    this.logger.log('Started');
    this.status('started');
    this.listen(
      chrome.devtools.network,
      'onNavigated',
      this.restart
    );
  };

  /**
   * Handler for messages from the server.
   *
   * @param {object} updatedResource
   * @private
   */

  Session.prototype.messageHandler = function(updatedResource) {
    this.logger.log('Requested resource update', updatedResource.resourceURL);

    if (updatedResource.reload) {
      chrome.devtools.inspectedWindow.reload();
      return;
    }

    var match = updatedResource.match;
    var matcher;

    if (typeof match === 'string') {
      if (match === 'indexOf') {
        matcher = indexOfMatcher;
      } else if (match === 'equal') {
        matcher = equalMatcher;
      } else {
        this.logger.error('Unknown match string option', match);
        return;
      }
    } else if (match && typeof match === 'object') {
      if (match.type === 'regexp') {
        var flags = '';
        if (match.ignoreCase) {
          flags += 'i';
        }
        if (match.multiline) {
          flags += 'm';
        }
        if (match.global) {
          flags += 'g';
        }
        var r = new RegExp(match.source, flags);
        matcher = r.exec.bind(r);
      } else {
        this.logger.error('Unknown matcher object:', match);
        return;
      }
    }

    var resource = this.resources.filter(function (res) {
      return matcher(res.url, updatedResource.resourceURL);
    })[0];

    if (!resource) {
      this.logger.error(
        'Resource with the following URL is not on the page:',
        updatedResource.resourceURL
      );
      return;
    }

    resource.setContent(updatedResource.contents, true, function (status) {
      if (status.code === 'OK') {
        this.logger.log('Resource update successful');
        triggerReloadEvent(updatedResource);
      } else {
        this.logger.error(
          'flo failed to update, this shouldn\'t happen please report it: ' +
            JSON.stringify(status)
        );
      }
    }.bind(this));
  };

  /**
   * Destroys session.
   *
   * @public
   */

  Session.prototype.destroy = function() {
    this.removeEventListeners();
    if (this.conn) this.conn.disconnect();
  };

  /**
   * Utility to ensure's a function is called only once.
   *
   * @param {function} cb
   * @private
   */

  function once(cb) {
    var called = false;
    return function() {
      if (!called) {
        called = true;
        return cb.apply(this, arguments);
      }
    };
  }

  function triggerReloadEvent(resource) {
    var data = {
      url: resource.resourceURL,
      contents: resource.contents
    };

    if ('string' === typeof resource.update) {
      var updateFnStr = '(function() {' +
        'try {' +
          '(' + resource.update + ')(window, ' + JSON.stringify(resource.resourceURL) + ');' +
          '} catch(ex) {' +
            'console.error("There was an error while evaluating the fb-flo update function. ' +
            'Please check the function\'s code and review the README guidelines regarding it!", ex);' +
          '}' +
        '})()';
        chrome.devtools.inspectedWindow.eval(updateFnStr);
    }

    var script = '(function() {' +
      'var event = new Event(\'fb-flo-reload\');' +
      'event.data = ' + JSON.stringify(data) + ';' +
      'window.dispatchEvent(event);' +
      '})()';

    chrome.devtools.inspectedWindow.eval(script);
  }

  function indexOfMatcher(val, resourceURL) {
    return val.indexOf(resourceURL) > -1;
  }

  function equalMatcher(val, resourceURL) {
    return resourceURL === val;
  }

}).call(this);
