fb-flo
---

fb-flo is a Chrome extension that lets you modify running apps without reloading. It's easy to integrate with your build system, dev environment, and can be used with your favorite editor.

## Usage

fb-flo is made up of a server and client component. This will guide through configuring your server for your project and installing the Chrome extension.

### 1. Configure fb-flo server

```
$ npm install fb-flo
```

fb-flo exports a single `fb-flo` function to start the server. Here is an example where you have your source JavaScript and CSS files in the root directory and your build step involves bundling both into a respective `bundle.js`, `bundle.css`.

```js
var flo = require('fb-flo'),
    path = require('path'),
    fs = require('fs');

var server = flo(
  sourceDirToWatch,
  {
    port: 8888,
    host: 'localhost',
    verbose: false,
    glob: [
       // All JS files in `sourceDirToWatch` and subdirectories
      '**/*.js',
       // All CSS files in `sourceDirToWatch` and subdirectories
      '**/*.css'
    ]
  },
  function resolver(filepath, callback) {
    // 1. Call into your compiler / bundler.
    // 2. Assuming that `bundle.js` is your output file, update `bundle.js`
    //    and `bundle.css` when a JS or CSS file changes.
    callback({
      resourceURL: 'bundle.js' + path.extname(filepath),
      // any string-ish value is acceptable. i.e. strings, Buffers etc.
      contents: fs.readFileSync(filepath)
    });
  }
);
```

`flo` takes the following arguments.

* `sourceDirToWatch`: absolute or relative path to the directory to watch that contains the source code that will be built.
* `options` hash of options:
    * `port` port to start the server on (defaults to 8888).
    * `host` to listen on.
    * `verbose` `true` or `false` value indicating if flo should be noisy.
    * `glob` a glob string or array of globs to match against the files to watch.
    * `useFilePolling` some platforms that do not support native file watching, you can force the file watcher to work in polling mode.
    * `pollingInterval` if in polling mode (useFilePolling) then you can set the interval at which to poll for file changes.
* `resolver` a function to map between files and resources.

The resolver callback is called with two arguments:

* `filepath` path to the file that changed relative to the watched directory.
* `callback` called to update a resource file in the browser. Should be called with an object with the following properties:
  * `resourceURL` used as the resource identifier in the browser.
  * `contents` any string-ish value representing the source of the updated file. i.e. strings, Buffers etc.
  * `reload` (optional) forces a full page reload. Use this if you're sure the changed code cannot be hotswapped.
  * `match` (optional, defaults to: indexOf) identifies the matching function to be performed on the resource URL in the browser. Could be one of the following:
    * `"equal"` test the updated resource `resourceURL` against existing browser resources using an equality check.
    * `"indexOf"` use `String.prototype.indexOf` check
    * `/regexp/` a regexp object to exec.

### 2. Install the Chrome Extension

Grab the [fb-flo Chrome extension](https://chrome.google.com/webstore/detail/ahkfhobdidabddlalamkkiafpipdfchp). This will add a new tab in your Chrome DevTools called 'flo'.

### 3. Activate fb-flo

To activate fb-flo from the browser:

* Open Chrome DevTools.
* Click on the new 'fb-flo' pane.
* Click on 'Activate for this site'

See screenshot:

![](http://i.imgur.com/SamY32i.png)

### Example

Say you have a Makefile program that builds your JavaScript and CSS into `build/build.js` and `build/build.css` respectively, this how you'd configure your fb-flo server:

```js
var flo = require('fb-flo');
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
```
