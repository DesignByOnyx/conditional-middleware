# conditional-middleware

This module allows you to compose a chain of middleware based on a condition. If the condition fails, the middleware does not execute - not even as a wrapper around `next()` calls.

```
npm install conditional-middleware --save
```

**Supported Middleware**

This module generates [connect-friendly](https://github.com/senchalabs/connect#mount-middleware) middleware and should be compatible with libraries like [Express](https://expressjs.com/), [flatiron/union](https://github.com/flatiron/union), et al. If you want support for others like Koa, please [create an issue](https://github.com/DesignByOnyx/conditional-middleware/issues) and I will do my best to add support as quickly as possible. 

```
// connect-friendly middleware:
(req, res, next) => { ... }
(err, req, res, next) => { ... } //-> must have exactly 4 arguments
```

> **Note:** I made this module with zero dependencies, so you can just copy and paste the code and modify if you don't want to wait on me. I ask that you please help make this better by submitting an issue so I know what you're wanting.

## Basic Usage

In the following example, if `shouldHandleRequest` returns **false**, middleware1 and middleware2 will not execute.

```js
const express = require('express');
const conditional = require('conditional-middleware');

function shouldHandleRequest (req) {
	return Math.random() > 0.5;
}

const app = express();
app.use(conditional(shouldHandleRequest, [ 
	middleware1, 
	middleware2 
]));
```

### Condition methods can return a promise

In the example above, `shouldHandleRequest` can return a promise:

```js
function shouldHandleRequest (req) {
    return Promise.resolve( Math.random() > 0.5 );
}
```

## Use a "context" for `if/else if` behavior

Consider a situation where you want to have multiple conditions but only want the first one that returns **true**. This type of behavior is availble by creating a "context". In the following example, as soon as one condition returns **true**, none of the other conditions are even checked.

```js
const express = require('express');
const conditional = require('conditional-middleware');

function isGithubWebhook (req) {
	return req.get('x-github-event');
}
function isBasicAuth (req) {
	return req.get('Authorization').indexOf('Basic') === 0;
}

const app = express();
conditional.createContext(_conditional => {
	// now use _conditional
	app.use(_conditional(isGithubWebhook, [
		validateGithubRequest,
		processGithubWebhook, 
		middleware_1,
		...
	]);
	// else if
	app.use(_conditional(isBasicAuth, [
		validateAuthCredentials, 
		middleware_2,
		...
	]);
	// else
	app.use(_conditional(() => true, [
		sendUnauthorizedResponse
	]);
});
```

### Create your own context

Instead of using the `createContext` method above, you can create your own context by passing a 3rd param. The following code is equivalent to the example above:

```js
const express = require('express');
const conditional = require('conditional-middleware');

// context passed as third parameter (see below)
const CONTEXT = "random_" + Math.random().slice(3);

function isGithubWebhook (req) {
	return req.get('x-github-event');
}
function isBasicAuth (req) {
	return req.get('Authorization').indexOf('Basic') === 0;
}

const app = express();
app.use(conditional(isGithubWebhook, [
	validateGithubRequest,
	processGithubWebhook, 
	middleware_1,
	...
], CONTEXT);
// else if
app.use(conditional(isBasicAuth, [
	validateAuthCredentials, 
	middleware_2,
	...
], CONTEXT);
// else
app.use(conditional(() => true, [
	sendUnauthorizedResponse
], CONTEXT);
```

## But what if the condtion returns false

Other modules like [express-conditional-middleware](https://www.npmjs.com/package/express-conditional-middleware) accept a "failure" function for when the condition fails. However, this is not necessary becuase the very next middleware will always run when the condition fails. Continuing with the basic example above, here is how you might handle a simple failure scenario:

```js
const express = require('express');
const conditional = require('conditional-middleware');

function shouldHandleRequest (req) {
	req.foobar = true; // set a custom property
	return false;
}

const app = express();
app.use(conditional(shouldHandleRequest, [ 
    thisWillNeverRun
]));

// the very next middleware will run
app.use((req, res, next) => {
	if (req.foobar) {
	    // something went foobar
	}
});
```