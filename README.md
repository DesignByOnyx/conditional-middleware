# conditional-middleware

This very lightweight module allows you to compose chains of middleware based on a condition. If the condition fails, the middleware chain does not execute - not even as a wrapper around `next()` calls.

```
npm install conditional-middleware --save
```

**Supported Middleware**

 - **[connect-friendly](https://github.com/senchalabs/connect#mount-middleware)** -  [Express](https://expressjs.com/), [flatiron/union](https://github.com/flatiron/union), et al. 

	```js
	// connect-friendly middleware:
	(req, res, next) => { ... }
	(err, req, res, next) => { ... } //-> must have exactly 4 arguments
	```
 - **[Koa]()** - Since KOA is so different, you must require a different file. Everything else is the same. **Note** - you must use use Node 7.6+ or Babel per Koa's requirements.

	```js
	// koa users must include like this
	const conditional = require('conditional-middleware/koa');
	
	// koa style middleware
	(ctx, next) => { ... }
	```

## Basic Usage
___
> **Koa Users:** The following examples use express. Anywhere you see '_express_' can be replaced with '_koa_'. Anywhere you see express-style middleware can be replaced with koa-style middleware. Also, remember you need to do this:
>
>   
> ```js
> const conditional = require('conditional-middleware/koa');
> ```
___

In the following example, if `shouldHandleRequest` returns **false**, _middleware1_ and _middleware2_ will not execute.

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

In the example above, `shouldHandleRequest` can return a promise. The promise must **`resolve`** to truthy or falsy. **You should never use `reject` to mean "condition failed"**.

```js
function shouldHandleRequest (req) {
    return Promise.resolve( Math.random() > 0.5 );
}
```

## Use a "context" for ` if/else if ` behavior

Consider a situation where you want to have multiple conditions but only want the first one that returns **true**. This type of behavior is availble by creating a "context". In the following example, as soon as one condition returns **true**, none of the other conditions are checked.

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

## But what if the condtion returns false?

Other modules like [express-conditional-middleware](https://www.npmjs.com/package/express-conditional-middleware) accept a "failure" function for when the condition fails. However, this is not necessary becuase the very next middleware will always run when the condition fails. Continuing with the basic example above, here is how you might handle a simple failure scenario:

```js
const express = require('express');
const conditional = require('conditional-middleware');

function alwaysFalse (req) {
	req.foobar = true; // set a custom property
	return false;
}

const app = express();
app.use(conditional(alwaysFalse, [ 
    thisWillNeverRun
]));

// the very next middleware will run
app.use((req, res, next) => {
	if (req.foobar) {
	    // something went foobar
	}
});
```

## What about nesting?

Yup, that works too! The `condtional` function will always return middleware, allowing you use it anywhere where you would use normally use middleware.

```js
const express = require('express');
const conditional = require('conditional-middleware');

const app = express();
app.use(conditional(() => true, [ 
    (req, res, next) => {
    	req.foo = true;
    	next();
    },
    conditional(() => true, [
    	(req, res, next) => {
    		req.bar = true;
    		next();
    	},
    	conditional(...)
    ]),
    (req, res, next) => {
    	assert.ok(req.foo, 'foo is set');
    	assert.ok(req.bar, 'bar is set');
    	next()
    }
]));
```

## What lies ahead?

- A new API? - [Cast your opinions here](https://github.com/DesignByOnyx/conditional-middleware/issues/2)
