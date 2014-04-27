flo
---

A static resource live editing tool for Chrome that's easy to integrate with your dev environment.

## Installation

### Install the extension

[TODO publish and add link to chrome webstore]

### Install flo

```
$ npm install -g flo
$ npm install flo
```

### Getting Started

### 1. Configure flo server

```js
var flo = require('flo');

var server = flo(
  dirToWatch,
  {
    port: 8888,
    host: 'localhost',
    verbose: false,
    glob: ['./lib/**/*.js', './lib/**/*.css']
  },
  resolverCallback
);
```

* `dirToWatch` absolute or relative path to the directory to watch.
* `options` hash of options:
    * `port` port to start the server on (defaults to 8888).
    * `host` to listen on.
    * `verbose` be noisy
    * `glob` a glob string or array of globs to match against the files to watch.
* `resolverCallback(filepath, callback)`: So a file with `filepath` has changed, this function is called to determine if and how we need to update the resource on the client.
  * `filepath` path to the file that changed relative to the watched directory
  * `callback` respond to the client with changed resource. A resource object should have the following properties:
    * `resourceURL` the resource URL that will be used to identify the resource to update in the browser.
    * `contents` the updated code.
    * `reload` Forces a full page reload. Use this if you're sure the changed code cannot be hotswapped.
    * `match` identifies the matching function to be performed on the resource URL in the browser. Could be one of the following:
      * `"equal"` test the updated resource `resourceURL` against existing browser resources using an equality check.
      * `"indexOf"` use `String.prototype.indexOf` check
      * `/regexp/` a regexp object to exec.

### 2. Activate flo

To activate flo from the browser:

* Open Chrome DevTools.
* Click on the new 'flo' pane.
* Click on 'Activate for this site'

See screenshot:

![](http://i.imgur.com/SamY32i.png)

### Example

Say you have a Makefile program that builds your JavaScript and CSS into `build/build.js` and `build/build.css` respectively, this how you'd configure your flo server:

```js
var flo = require('flo');
var fs = require('fs');
var exec = require('child_process').exec;

module.exports = {
  resolver: function (filepath, callback) {
    exec('make', function (err) {
      if (err) throw err;
      if (filepath.match(/\.js$/)) {
        callback({
          resourceURL: 'build/build.js',
          contents: fs.readFileSync('build/build.js').toString()
        })
      } else {
        callback({
          resourceURL: 'build/build.css',
          contents: fs.readFileSync('build/build.css').toString()
        })
      }
    });
  },
  ready: function() {
    console.log('ready');
  },
  options: {
    port: 8888,
    dir: './lib/',
    glob: ['./lib/**/*.js', './lib/**/*.css']
  }
};
```

