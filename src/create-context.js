'use strict';

module.exports = conditional => {
	conditional.createContext = fn => {
		// only needs to be pseudo-random
		const unguessable = Math.random().toString(36).slice(2);
		fn((condition, middlewares) => conditional(condition, middlewares, unguessable));
	};
};
