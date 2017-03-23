const assert = require('chai').assert;
const rewire = require('rewire');

describe('promisify helper', () => {
	let promisify;
	before(() => {
		promisify = rewire('../src/index').__get__('promisify');
	});

	it('converts node callback-style functions to promises', () => {
		const fn = promisify((foo, bar, next) => {
			assert.equal(foo, 'foo', 'foo argument is correct');
			assert.equal(bar, 'bar', 'bar argument is correct');
			next(null, 'success');
		});

		const promise = fn('foo', 'bar');
		assert.equal(typeof promise.then, 'function', 'fn returns a then-able object');

		return promise.then(result => {
			assert.equal(result, 'success', 'result was success');
		});
	});

	it('rejects if the internal callback passes an error as the first argument', done => {
		const fn = promisify(next => next('failure'));

		fn().catch(err => {
			assert.equal(err, 'failure');
			done();
		});
	});
});

describe('chainMiddleware helper', () => {
	let chainMiddleware;
	before(() => {
		chainMiddleware = rewire('../src/index').__get__('chainMiddleware');
	});

	it('chains middleware onto a promise', () => {
		const middleware = (req, res, next) => {
			next(null, 'notfoobar')
		};
		const reducer = chainMiddleware({}, {});
		const promise = [middleware].reduce(reducer, Promise.resolve('foobar'));
		assert.equal(typeof promise.then, 'function', 'returns then-able object');
		assert.equal(typeof promise.catch, 'function', 'returns catch-able object');
		return promise.then(result => {
			assert.equal(result, 'notfoobar', 'got the result we expected');
		});
	});

	it('produces a catchable promise', done => {
		const middleware = (req, res, next) => {
			next('error')
		};
		const reducer = chainMiddleware({}, {});
		const promise = [middleware].reduce(reducer, Promise.resolve());
		assert.equal(typeof promise.then, 'function', 'returns then-able object');
		assert.equal(typeof promise.catch, 'function', 'returns catch-able object');
		promise.catch(err => {
			assert.equal(err, 'error', 'got the error');
			done();
		});
	});

	it('works with error handler middleware (exactly 4 args)', done => {
		const middleware1 = (req, res, next) => {
			next('error')
		};
		const middleware2 = (err, req, res, next) => {
			assert.equal(err, 'error', 'got the error');
			done();
		};
		const reducer = chainMiddleware({}, {});
		[middleware1, middleware2].reduce(reducer, Promise.resolve()).catch(done);
	});
});

describe('conditionalMiddleware', () => {
	let conditional;
	before(() => {
		conditional = rewire('../src/index').__get__('conditionalMiddleware');
	});

	it('works when the condition returns a boolean true', done => {
		const middleware = conditional(() => true, [() => {
			done();
		}]);
		middleware({}, {});
	});

	it('skips when the condition returns a boolean false', done => {
		const middleware = conditional(() => false, [(req, res, next) => {
			next('Should not have made it here');
		}]);
		middleware({}, {}, done);
	});

	it('works when the condition returns a promise true', done => {
		const middleware = conditional(() => Promise.resolve(true), [() => {
			done();
		}]);
		middleware({}, {}, done);
	});

	it('skips when the condition returns a promise false', done => {
		const middleware = conditional(() => Promise.resolve(false), [(req, res, next) => {
			next('Should not have made it here');
		}]);
		middleware({}, {}, done);
	});

	it('calls the middleware in order if the condition passes', done => {
		const middleware = conditional(req => true, [
			(req, res, next) => {
				if (req.mw2) {
					next(new Error('should not have hit middleware 2 yet!'));
					return;
				}
				req.mw1 = true;
				next();
			},
			(req, res, next) => {
				if (!req.mw1) {
					next(new Error('middleware 1 should have been called first'));
					return;
				}
				req.mw2 = true;
				next();
			},
			(req, res, next) => {
				if (!req.mw2) {
					next(new Error('middleware 2 should have been called by now'));
					return;
				}
				next();
			}
		]);
		middleware({}, {}, done);
	});



	it('does not run subsequent middleware chains within the same "context"', done => {
		const CONTEXT = 'arbitrary_context';
		const request = {};
		const middleware1 = conditional(req => true, [(req, res, next) => {
			next();
		}], CONTEXT);

		const middleware2 = conditional(req => true, [(req, res, next) => {
			next(new Error('Should not have hit this middleware'));
		}], CONTEXT);

		middleware1(request, {}, (err) => {
			if (err) return done(err);
			assert.ok(request[CONTEXT], 'request object has context set');

			middleware2(request, {}, done);
		});
	});

	describe('createContext method', () => {
		it('creates a context for the underlying middleware', done => {
			conditional.createContext(_conditional => {
				const request = {};
				const middleware1 = _conditional(req => true, [(req, res, next) => {
					next();
				}]);

				const middleware2 = _conditional(req => true, [(req, res, next) => {
					next(new Error('Should not have hit this middleware'));
				}]);

				middleware1(request, {}, (err) => {
					if (err) return done(err);
					middleware2(request, {}, done);
				});
			})
		});
	});
});
