'use strict';

const assert = require('chai').assert;
const rewire = require('rewire');

module.exports = (name, src, makeArgs) => {
	describe(`Common tests: ${name}`, () => {
		let conditional, MWARGS;
		before(() => {
			conditional = rewire(src);
		});
		beforeEach(() => {
			MWARGS = makeArgs();
		});

		it('works when the condition returns a boolean true', done => {
			const middleware = conditional(() => true, [(...args) => {
				args.pop()();
			}]);
			middleware.call(...MWARGS, done);
		});

		it('skips when the condition returns a boolean false', done => {
			const middleware = conditional(() => false, [(...args) => {
				args.pop()('Should not have made it here');
			}]);
			middleware.call(...MWARGS, done);
		});

		it('works when the condition returns a promise true', done => {
			const middleware = conditional(() => Promise.resolve(true), [(...args) => {
				args.pop()();
			}]);
			middleware.call(...MWARGS, done);
		});

		it('skips when the condition returns a promise false', done => {
			const middleware = conditional(() => Promise.resolve(false), [(...args) => {
				args.pop()('Should not have made it here');
			}]);
			middleware.call(...MWARGS, done);
		});

		it('calls the middleware in order', done => {
			const middleware = conditional(() => true, [
				(...args) => {
					const next = args.pop();
					if (args[0].mw2) {
						next(new Error('should not have hit middleware 2 yet!'));
						return;
					}
					args[0].mw1 = true;
					next();
				},
				(...args) => {
					const next = args.pop();
					if (!args[0].mw1) {
						next(new Error('middleware 1 should have been called first'));
						return;
					}
					args[0].mw2 = true;
					next();
				},
				(...args) => {
					const next = args.pop();
					if (!args[0].mw2) {
						next(new Error('middleware 2 should have been called by now'));
						return;
					}
					next();
				}
			]);
			middleware.call(...MWARGS, done);
		});

		it('does not run subsequent middleware chains within the same "context"', done => {
			const CONTEXT = 'arbitrary_context';
			const middleware1 = conditional(req => true, [(...args) => {
				assert.ok(args[0][CONTEXT], 'object has context set');
				args.pop()();
			}], CONTEXT);

			const middleware2 = conditional(req => true, [(...args) => {
				args.pop()(new Error('Should not have hit this middleware'));
			}], CONTEXT);

			middleware1.call(...MWARGS, (err) => {
				if (err) return done(err);
				middleware2.call(...MWARGS, done);
			});
		});

		describe('createContext method', () => {
			it('creates a context for the underlying middleware', done => {
				conditional.createContext(_conditional => {
					const middleware1 = _conditional(req => true, [(...args) => {
						args.pop()();
					}]);

					const middleware2 = _conditional(req => true, [(...args) => {
						args.pop()(new Error('Should not have hit this middleware'));
					}]);

					middleware1.call(...MWARGS, (err) => {
						if (err) return done(err);
						middleware2.call(...MWARGS, done);
					});
				})
			});
		});

		describe('nesting conditionals', () => {
			it('works', done => {
				const middleware = conditional(() => true, [
					(...args) => {
						args[0].foo = true;
						args.pop()();
					},
					conditional(() => true, [
						(...args) => {
							args[0].bar = true;
							args.pop()();
						}
					]),
					(...args) => {
						assert.ok(args[0].foo, 'foo is set');
						assert.ok(args[0].bar, 'bar is set');
						args.pop()();
					}
				]);
				middleware.call(...MWARGS, done);
			});
		});
	});
};
