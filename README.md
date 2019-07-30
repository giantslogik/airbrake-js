# Airbrake-JS

This is a react native compatible fork. The default repo depends on node's implementation of require which is incompatible with react native.


[![Build Status](https://travis-ci.org/airbrake/airbrake-js.svg?branch=master)](https://travis-ci.org/airbrake/airbrake-js)
[![CDNJS](https://img.shields.io/cdnjs/v/airbrake-js.svg)](https://cdnjs.com/libraries/airbrake-js)

This is the JavaScript notifier for capturing errors in web browsers and reporting them to [Airbrake](http://airbrake.io).

<img src="http://f.cl.ly/items/443E2J1D2W3x1E1u3j1u/JS-airbrakeman.jpg" width=800px>

## Installation
This form can be installed using:
npm install giantslogik/airbrake-js --save

airbrake-js can be installed using yarn:


```sh
yarn add airbrake-js
```

or using npm:

```sh
npm install airbrake-js
```

If you prefer not to host the library yourself,
airbrake-js is available on the excellent
[cdnjs](https://cdnjs.com/libraries/airbrake-js).

## Setup

Starting from v2 airbrake-js uses [rollup.js](https://rollupjs.org) to provide 3 separate build formats:

- dist/airbrake.iife.js - a self-executing function, suitable for inclusion as a <script> tag.
- dist/airbrake.esm.js - an ES module file, suitable for other bundlers and inclusion as a <script type=module> tag in modern browsers.
- dist/airbrake.common.js - CommonJS, suitable for Node.js and other bundlers.

Your package manager should automatically pick suitable bundle format based on airbrake-js package.json file:

```js
  "main": "dist/airbrake.common.js",
  "web": "dist/airbrake.iife.js",
  "module": "dist/airbrake.esm.js",
  "jsnext:main": "dist/airbrake.esm.js",
  "types": "dist/airbrake.d.ts",
  "source": "src/index.ts",
```

Example configurations can be found in [examples](examples), including:

* [Angular](examples/angular)
* [Angular 2](examples/angular-2)
* [Browserify](examples/browserify)
* [Express.js](examples/express)
* [Legacy](examples/legacy)
* [Node.js](examples/nodejs)
* [Rails](examples/rails)
* [React](examples/react)
* [Redux](examples/redux)
* [Vue.js](examples/vuejs)

## Basic Usage

First you need to initialize the notifier with the project id and API key taken from [Airbrake.io](https://airbrake.io):

```js
var airbrake = new airbrakeJs.Client({
  projectId: 1,
  projectKey: 'REPLACE_ME',
  environment: 'production',
});
```

Or if you are using browserify/webpack/etc:

```js
var AirbrakeClient = require('airbrake-js');
var airbrake = new AirbrakeClient({...});
```

Then you can send a textual message to Airbrake:

```js
var promise = airbrake.notify(`user id=${user_id} not found`);
promise.then(function(notice) {
  if (notice.id) {
    console.log('notice id', notice.id);
  } else {
    console.log('notify failed', notice.error);
  }
});
```

Or report catched errors directly:

```js
try {
  // This will throw if the document has no head tag
  document.head.insertBefore(document.createElement('style'));
} catch(err) {
  airbrake.notify(err);
  throw err;
}
```

Alternatively, you can wrap any code which may throw errors using the client's `wrap` method:

```js
var startApp = function() {
  // This will throw if the document has no head tag.
  document.head.insertBefore(document.createElement('style'));
}
startApp = airbrake.wrap(startApp);

// Any exceptions thrown in startApp will be reported to Airbrake.
startApp();
```

or use `call` shortcut:

```js
var startApp = function() {
  // This will throw if the document has no head tag.
  document.head.insertBefore(document.createElement('style'));
}

airbrake.call(startApp);
```

## Advanced Usage

### Notice Annotations

It's possible to annotate error notices with all sorts of useful information at the time they're captured by supplying it in the object being reported.

```js
try {
  startApp();
} catch (err) {
  airbrake.notify({
    error:       err,
    context:     { component: 'bootstrap' },
    environment: { env1: 'value' },
    params:      { param1: 'value' },
    session:     { session1: 'value' },
  });
  throw err;
}
```

### Severity

[Severity](https://airbrake.io/docs/airbrake-faq/what-is-severity/) allows categorizing how severe an error is. By default, it's set to `error`. To redefine severity, simply overwrite `context/severity` of a notice object. For example:

```js
airbrake.notify({
  error: err,
  context: { severity: 'warning' }
});
```

### Filtering errors

There may be some errors thrown in your application that you're not interested in sending to Airbrake, such as errors thrown by 3rd-party libraries, or by browser extensions run by your users.

The Airbrake notifier makes it simple to ignore this chaff while still processing legitimate errors. Add filters to the notifier by providing filter functions to `addFilter`.

`addFilter` accepts the entire [error notice](https://airbrake.io/docs/api/#create-notice-v3) to be sent to Airbrake, and provides access to the `context`, `environment`, `params`, and `session` values submitted with the notice, as well as the single-element `errors` array with its `backtrace` element and associated backtrace lines.

The return value of the filter function determines whether or not the error notice will be submitted.
  * If a null value is returned, the notice is ignored.
  * Otherwise, the returned notice will be submitted.

An error notice must pass all provided filters to be submitted.

In the following example all errors triggered by admins will be ignored:

```js
airbrake.addFilter(function(notice) {
  if (notice.params.admin) {
    // Ignore errors from admin sessions.
    return null;
  }
  return notice;
});
```

Filters can be also used to modify notice payload, e.g. to set the environment and application version:

```js
airbrake.addFilter(function(notice) {
  notice.context.environment = 'production';
  notice.context.version = '1.2.3';
  return notice;
});
```

### Filtering keys

With `keysBlacklist` option you can specify list of keys containing sensitive information that must be filtered out, e.g.:

```js
var airbrake = new AirbrakeClient({
    ...
    keysBlacklist: [
      'password', // exact match
      /secret/, // regexp match
    ],
});
```

### Source maps

Airbrake supports using private and public source maps. Check out our docs for more info:
- [Private source maps](https://airbrake.io/docs/features/private-sourcemaps/)
- [Public source maps](https://airbrake.io/docs/features/public-sourcemaps/)


### Instrumentation

airbrake-js automatically instruments `console.log` function calls in order to collect logs and send them with first error. You can disable that behavior using `instrumentation` option:

```js
var airbrake = new airbrakeJs.Client({
  ...
  instrumentation: {
    console: false,
  },
});
```

### Node.js request and proxy

In order to configure [request](https://github.com/request/request) HTTP client you can pass `request` option which accepts request wrapper:

```js
var airbrake = new AirbrakeClient({
  ...
  request: request.defaults({'proxy':'http://localproxy.com'})
});
```

## Integration

### window.onerror

airbrake-js automatically setups `window.onerror` handler when script is loaded. It also makes sure to call old error handler if there are any. Errors reported by `window.onerror` can be ignored using `ignoreWindowError` option:

```js
var airbrake = new airbrakeJs.Client({ignoreWindowError: true});
```

## FAQ

### What does "Script error" mean?

See https://developer.mozilla.org/en/docs/Web/API/GlobalEventHandlers/onerror#Notes.

## Contributing

Install dependencies:

```bash
yarn install
```

Run unit tests:

```bash
yarn test
```

Build project:

```bash
yarn build
```

## Credits

Airbrake is maintained and funded by [airbrake.io](http://airbrake.io)

Thank you to all [the contributors](https://github.com/airbrake/airbrake-js/contributors).

The names and logos for Airbrake are trademarks of Airbrake Technologies Inc.

# License

Airbrake is Copyright © 2008-2017 Airbrake Technologies Inc. It is free software, and may be redistributed under the terms specified in the MIT-LICENSE file.
