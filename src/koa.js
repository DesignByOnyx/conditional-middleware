'use strict';

const chainMiddleware = (ctx) => {
	return (_next, middleware) => {
		return () => middleware(ctx, _next);
	}
};

const conditionalMiddleware = (condition, middlewares, namespace) => {
	// One "outer" middleware will be created.
	return async (ctx, next) => {
		// If a condition was already true, then skip
		if (namespace && ctx[namespace] === true || !await condition(ctx.request)) {
			return next();
		}

		// tells others to skip
		if (namespace) ctx[namespace] = true;
		return middlewares.reverse().reduce(chainMiddleware(ctx), next)();
	};
};

require('./create-context')(conditionalMiddleware);
module.exports = conditionalMiddleware;
