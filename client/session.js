/*global Connection:false,logger:false*/

this.Session = (function () {
  'use strict';

  function Session(host, port, status, logger) {
    this.host = host;
    this.port = port;
    this.status = status;
    this.logger = logger;
    this.log = logger('session');
    this.resources = null;
    this.conn = null;
    this.listeners = {};
  }

  /**
   * Registers the resources, connects to server and listens to events.
   * @api
   */
  Session.prototype.start = function() {
    this.log('Starting flo for host', this.host);
    this._getResources(this._connect.bind(this, this._started.bind(this)));
  };

  /**
   * Similar to restart but does only what's needed to get flo started.
   * @api
   */
  Session.prototype.restart = function() {
    this.log('Restarting');
    this._removeEventListeners();
    if (this.conn.connected()) {
      logger.logInContext('flo running.');
      // No need to reconnect. We just refetch the resources.
      this._getResources(this._started.bind(this));
    } else {
      this.start();
    }
  };

  /**
   * This method takes care of listening to events defined by the chrome api
   * @see http://developer.chrome.com/extensions/events
   * We also keep an internal map of events we're listening to so we can
   * unsubscribe in the future.
   * @arg {object} object
   * @arg {string} event
   * @arg {function} listener
   */
  Session.prototype._listen = function(obj, event, listener) {
    listener = listener.bind(this);
    obj[event].addListener(listener);
    this.listeners[event] = {
      obj: obj,
      listener: listener
    };
  };


  /**
   * Remove all listeners to the chrome event api, @see this._listen
   */
  Session.prototype._removeEventListeners = function() {
    Object.keys(this.listeners).forEach(function(event) {
      var desc = this.listeners[event];
      desc.obj[event].removeListener(desc.listener);
    }, this);
  };

  /**
   * Registers the resources and listens to onResourceAdded events.
   * @arg {function} callback
   */
  Session.prototype._getResources = function(callback) {
    var self = this;
    chrome.devtools.inspectedWindow.getResources(function (resources) {
      self.resources = resources;
      // After we register the current resources, we listen to the
      // onResourceAdded event to push on more resources lazily fetched
      // to our array.
      self._listen(
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
   * Utility to ensure's a function is called only once.
   * @arg {function} cb
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

  /**
   * @arg {function} callback
   */
  Session.prototype._connect = function(callback) {
    callback = once(callback);
    var self = this;
    this.conn = new Connection(this.host, this.port, this.logger)
      .message(this._onMessage.bind(this))
      .error(function (err) {
        callback();
        self.status('error');
      })
      .open(function () {
        callback();
        self.status('connected');
      })
      .retry(function(delay) {
        self.status('retry', delay);
      })
      .connecting(function() {
        self.status('connecting');
      })
      .connect();
  };

  /**
   * Does whatever needs to be done after the session is started. Currenlty
   * just listening to page refresh events.
   * @arg {function} callback
   */
  Session.prototype._started = function() {
    this._listen(
      chrome.devtools.network,
      'onNavigated',
      this.restart
    );
  };

  function indexOfMatcher(val, resourceURL) {
    return val.indexOf(resourceURL) > -1;
  }

  function equalMatcher(val, resourceURL) {
    return resourceURL === val;
  }

  /**
   * Handler for messages from the server.
   * @arg {object} msg
   */
  Session.prototype._onMessage = function(updatedResource) {
    this.log('Requested resource update', updatedResource.resourceURL);

    var match = updatedResource.match;
    var matcher;

    if (typeof match === 'string') {
      if (match === 'indexOf') {
        matcher = indexOfMatcher;
      } else if (match === 'equal') {
        matcher = equalMatcher;
      } else {
        throw new Error('Unknown match string option ' + match);
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
        throw new Error('Unknown match object option');
      }
    }

    var resource = this.resources.filter(function (res) {
      return matcher(res.url, updatedResource.resourceURL);
    })[0];

    if (!resource) {
      throw new Error('Resource not found: ' + updatedResource.resourceURL);
    }

    resource.setContent(updatedResource.contents, true, function (status) {
      if (status.code === 'OK') {
        this.log('Resource update successful');
      } else {
        this.log(
          'flo failed to update, please report the following to amasad@fb.com' +
            JSON.stringify(status)
        );
      }
    }.bind(this));
  };

  Session.prototype.destroy = function() {
    this._removeEventListeners();
    this.conn && this.conn.disconnect();
  };

  return Session;
})();
