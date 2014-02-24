flo
---

flo enables static resource hot swapping in Chrome while easily integrating into your build step and development tools.
You can write code using your favorite editor and see it almost instantaneously in the browser without reloading the page.

## Quickstart

### Install the extension

[TODO publish and add link to chrome webstore]

### Install the flo cli

```
$ npm install -g flo
```

### Start the server

If you have no build step and serve your assets directly from your root www folder then just navigate
to your www root and start flo:

```
$ flo
```

If you have a build step that you need to integrate flo into then you have two choices:

1. Use flofile.js
2. Use flo as a node module

#### flofile.js

When you start `flo` it will automatically look for `flofile.js` and if that's available it will be expected to export the following:

1. `resolver`: a required function that's responsible for resolving file system changes to asset changes.
2. `options`: an optional options hash with the following options:
  1. `dir`: the directory to watch (defaults to current working directory).
  2. `port`: port to start the server on (defaults to 8888).
  3. `host`: to listen on.
  4. `verbose`: be noisy
3. `ready`: an optional ready event handler.

The `resolver` function should expect the following params:

1. `filepath`: path to the file that changed relative to the watched directory
2. `callback`: a callback function to respond with the resource to send to the client, it should send an object with:
  1. `resourceURL`: the resource URL that will be used to identify the resource to update in the browser.
  2. `contents`: the updated code.
  3. `match`: identifies the matching function to be performed on the resource URL in the browser. Could be one of the following:
    1. `"equal"` test the updated resource `resourceURL` against existing browser resources using an equality check.
    2. `"indexOf"` use `String.prototype.indexOf` check
    3. `/regexp/` a regexp object to exec.

If I had a Makefile program that builds my JavaScript and CSS into `build/build.js/css` then I could have the following `flofile.js`:

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
    dir: './lib/'
  }
};
```

#### Use flo programmatically

flo exports a single function:

```js
flo(dirToWatch, [options, resolver(filepath, callback)])
```

If you don't have a static resource build-step your flo call could like like this:

```js
var flo = require('flo')
flo(
  '/path/to/www/root',
  { port: 8888, host: 'localhost' },
  function (filepath, callback) {
    callback({
      resourceURL: filepath,
      contents: fs.readFileSync(filepath).toString()
    });
  }
);
```

In reality, flo defaults the options and resolver callback to exactly that, so you can just do:

```js
flo('/path/to/www/root');
```
