flo
---

Flo is a static resource live editing tool for Chrome that's easy to integrate with your dev environment.

## Usage

### 1. Configure flo server

```js
var flo = require('flo');

var server = flo(
  dirToWatch,
  {
    port: 8888,
    host: 'localhost',
    verbose: false,
    glob: ['*.js', '*.css']
  },
  function resolver(filepath, callback) {
    // Update bundle.js and bundle.css when a JS or CSS file changes.
    callback({
      resourceURL: 'bundle.js' + path.extname(filepath),
      content: fs.readFileSync(filepath)
    });
  }
);
```

A single function `flo` is exported and takes the following arguments:

* `dirToWatch`: absolute or relative path to the directory to watch.
* `options` hash of options:
    * `port` port to start the server on (defaults to 8888).
    * `host` to listen on.
    * `verbose` be noisy.
    * `glob` a glob string or array of globs to match against the files to watch.
* `resolver` a function to map between files and resources.

The resolver callback is called with two arguments:

* `filepath` path to the file that changed relative to the watched directory.
* `callback` called to update a resource file in the browser. Should be called with an object with the following properties:
  * `resourceURL` used as an the resource identifier in the browser.
  * `contents` the updated code.
  * `reload` (optional) forces a full page reload. Use this if you're sure the changed code cannot be hotswapped.
  * `match` (optional, defaults to: indexOf) identifies the matching function to be performed on the resource URL in the browser. Could be one of the following:
    * `"equal"` test the updated resource `resourceURL` against existing browser resources using an equality check.
    * `"indexOf"` use `String.prototype.indexOf` check
    * `/regexp/` a regexp object to exec.

### 2. Install the Chrome Extension

Grab the [flo Chrome extension](https://chrome.google.com/webstore/detail/ahkfhobdidabddlalamkkiafpipdfchp). This will add a new tab in your Chrome DevTools called 'flo'.

### 3. Activate flo

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

var server = flo('./lib/', {
  port: 8888,
  dir: './lib/',
  glob: ['./lib/**/*.js', './lib/**/*.css']
}, resolver);

server.once('ready', function() {
  console.log('Ready!');
});

function resolver(filepath, callback) {
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
  }
};
```
