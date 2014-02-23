/*global Connection:false,logger:false*/

this.Session = (function () {
  'use strict';

  var log = logger('session');

  function Session(loc) {
    this.loc = loc;
    this.resources = null;
    this.conn = null;
    this.listeners = {};
  }

  /**
   * Registers the resources, connects to server and listens to events.
   * @api
   */
  Session.prototype.start = function() {
    log('Starting flo for host', this.loc.host);
    this._getResources(this._connect.bind(this, this._started.bind(this)));
  };

  /**
   * Similar to restart but does only what's needed to get flo started.
   * @api
   */
  Session.prototype.restart = function() {
    log('Restarting');
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
    this.conn = new Connection(this.loc.host)
      .message(this._onMessage.bind(this))
      .error(function (err) {
        logger.logInContext(
          'flo error: ' + err.message,
          'error'
        );
        callback();
      })
      .open(function () {
        logger.logInContext(
          'flo started',
          'debug'
        );
        callback();
      })
      .connect();

    logger.logInContext(
      'flo starting, connecting to host ' + this.loc.host,
      'debug'
    );
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
    return resourceURL.indexOf(val) > -1;
  }

  function equalMatcher(val, resourceURL) {
    return resourceURL === val;
  }

  /**
   * Handler for messages from the server.
   * @arg {object} msg
   */
  Session.prototype._onMessage = function(updatedResource) {
    log('Requested resource update', updatedResource.resourceURL);

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
        log('Resource update successful', status);
      } else {
        console.error(status);
        logger.logInContext(
          'flo failed to update, please report the following to amasad@fb.com' +
            JSON.strigify(status),
          'error'
        );
      }
    });
  };

  return Session;
})();
