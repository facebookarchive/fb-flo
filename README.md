fb-flo
---

fb-flo is a Chrome extension that lets you modify running apps without reloading. It's easy to integrate with your build system, dev environment, and can be used with your favorite editor. Read more about it on [https://facebook.github.io/fb-flo/](https://facebook.github.io/fb-flo/)

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
      resourceURL: 'bundle' + path.extname(filepath),
      // any string-ish value is acceptable. i.e. strings, Buffers etc.
      contents: fs.readFileSync(filepath),
      update: function(_window, _resourceURL) {
        // this function is executed in the browser, immediately after the resource has been updated with new content
        // perform additional steps here to reinitialize your application so it would take advantage of the new resource
        console.log("Resource " + _resourceURL + " has just been updated with new content");
      }
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
    * `useWatchman` when watching a large number of folders or where watching is buggy you can use (watchman)[https://facebook.github.io/watchman/].
    * `useFilePolling` some platforms that do not support native file watching, you can force the file watcher to work in polling mode.
    * `pollingInterval` if in polling mode (useFilePolling) then you can set the interval (in milliseconds) at which to poll for file changes.
    * `watchDotFiles` dot files are not watched by default.
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
  * `update` (optional) a function that will be executed in the browser, immediately after the resource has been updated. This can be used to run custom code that updates your application. It receives the `window` and the `resourceURL` as parameters. This function will be stringified so it could be sent to the client. Make sure you don't use any variables defined outside this function, as they won't be available, and you will get an error.

### 2. Install the Chrome Extension

Grab the [fb-flo Chrome extension](https://chrome.google.com/webstore/detail/ahkfhobdidabddlalamkkiafpipdfchp). This will add a new tab in your Chrome DevTools called 'flo'.

### 3. Activate fb-flo

To activate fb-flo from the browser:

* Open Chrome DevTools.
* Click on the new 'fb-flo' pane.
* Click on 'Activate for this site'

See screenshot:

![](http://i.imgur.com/SamY32i.png)

As an alternative to the `update` function, after any resource is updated, the `fb-flo-reload` event will be triggered on the `window`. The event's data will contain the `url` and `contents` that were provided to the `callback` function on the `flo-server`. The difference between the the `update` function and the `fb-flo-reload` event is that the first one is defined on the server and executed in the client, while the later is defined on the client and executed there as well. It is preferred to use the `update` function, since you won't load your app with code specific to live-editing. Example:
```js
window.addEventListener('fb-flo-reload', function(ev) {
    // perform additional steps here to reinitialize your application so it would take advantage of the new resource
    console.log("Resource " + ev.data.url + " has just been replaced with this new content: " + ev.data.contents);
});
```

### Example

Say you have a Makefile program that builds your JavaScript and CSS into `build/build.js` and `build/build.css` respectively, this how you'd configure your fb-flo server:

```js
var flo = require('fb-flo'),
    fs = require('fs'),
    path = require('path'),
    exec = require('child_process').exec;

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
      callback({
        resourceURL: 'build/build' + path.extname(filepath),
        contents: fs.readFileSync('build/build' + path.extname(filepath)).toString()
      })
    });
}
```
