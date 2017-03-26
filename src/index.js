'use strict';

// Converts a node-style callback function to a promise
// This was easy enough to implement without needing a dependency
const promisify = fn => {
	return (...args) => {
		return new Promise((resolve, reject) => {
			fn.call(null, ...args, (err, result) => {
				if (err) return reject(err);
				resolve(result);
			});
		});
	};
};

// Generates a reducer function for chaining middleware via promises
const chainMiddleware = (req, res) => {
	return (promise, middleware) => {
		const pMiddleware = promisify(middleware);
		// connect middleware with "exactly 4 arguments" are treated differently
		// (err, req, res, next) => { ... }
		if (middleware.length === 4) {
			return promise
				.then(() => pMiddleware(null, req, res))
				.catch(err => pMiddleware(err, req, res));
		}
		// (req, res, next) => { ... }
		return promise.then(() => pMiddleware(req, res));
	};
};

const conditionalMiddleware = (condition, middlewares, context) => {
	// One "outer" middleware will be created.
	return (req, res, next) => {
		// If a condition was already true, then skip
		if (context && req[context] === true) {
			return next();
		}
		Promise.resolve(condition(req)).then(truthy => {
			if (truthy) {
				// tells others to skip
				if (context) req[context] = true;
				return middlewares.reduce(chainMiddleware(req, res), Promise.resolve())
				.then(next)
				.catch(next);
			}
			next();
		})
		.catch(next);
	};
};

require('./create-context')(conditionalMiddleware);
module.exports = conditionalMiddleware;
