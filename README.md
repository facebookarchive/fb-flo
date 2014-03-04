flo
---

Web live coding tool that is easy to integrate with your build step and development environment.

flo enables static resource hot swapping in Chrome while easily integrating into your build step and development environment.
You can write code using your favorite editor and see it almost instantaneously in the browser without reloading the page.

## Installation

### Install the extension

[TODO publish and add link to chrome webstore]

### Install flo

```
$ npm install -g flo
$ npm install flo
```

### Getting Started

There are a few ways to start the flo server, follow the section applicable to your use case.

### Starting the flo server

#### You have no build step

If you have no build step and serve your assets directly from your root www folder then just navigate
to your www root and start flo:

```
$ flo
```

#### You have a build step and want to use the CLI

When you start `flo` it will automatically look for `flofile.js` and if that's available it will be expected to export an object with the flo config.

For example, If you have a Makefile program that builds my JavaScript and CSS into `build/build.js` and `build/build.css` respectively then I would have the following `flofile.js`:

```js
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

##### flofile.js config

* [`resolver`](#resolverfilepath-callback): a required function that's responsible for resolving file system changes to asset changes. See [`resolver`](#resolverfilepath-callback).
* `options`: an optional options hash with the following options:
  * `dir`: the directory to watch (defaults to current working directory).
  * `port`: port to start the server on (defaults to 8888).
  * `host`: to listen on.
  * `verbose`: be noisy
  * `glob`: a glob string or array of globs to match against the files to watch.
* `ready`: an optional ready event handler.

#### You have a build step and want to use flo programmatically

flo exports a single function:
```js
flo(dirToWatch, [options], [resolver(filepath, callback)])
```
* `dirToWatch` absolute or relative path to the directory to watch.
* `options` hash of options:
    * `port`: port to start the server on (defaults to 8888).
    * `host`: to listen on.
    * `verbose`: be noisy
    * `glob`: a glob string or array of globs to match against the files to watch.
* `ready`: an optional ready event handler.

#### resolver(filepath, resourceChangeCallback)

So a file with `filepath` has changed, this function is called to determine whether and how we need to update the resource on the client.

* `filepath`: path to the file that changed relative to the watched directory
* `resourceChangeCallback`: a callback function to respond with the resource to send to the client, it should send an object with:
  * `resourceURL`: the resource URL that will be used to identify the resource to update in the browser.
  * `contents`: the updated code.
  * `match`: identifies the matching function to be performed on the resource URL in the browser. Could be one of the following:
    * `"equal"` test the updated resource `resourceURL` against existing browser resources using an equality check.
    * `"indexOf"` use `String.prototype.indexOf` check
    * `/regexp/` a regexp object to exec.

### Activating flo from Chrome

To activate flo from the browser:

* Open Chrome DevTools.
* Click on the new 'flo' pane.
* Click on 'Activate for this site'

See screenshot:

![](http://i.imgur.com/SamY32i.png)
