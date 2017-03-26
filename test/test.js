'use strict';

const assert = require('chai').assert;
const rewire = require('rewire');
const compareVersions = require('compare-versions');
const commonTests = require('./common');

const KOA_COMPAT = compareVersions(process.version.replace(/^v/, ''), '7.6.0');
const CONNECT = '../src/index';

describe('connect helpers', () => {
	describe('promisify', () => {
		let promisify;
		before(() => {
			promisify = rewire(CONNECT).__get__('promisify');
		});

		it('converts node callback-style functions to promises', () => {
			const fn = promisify((foo, bar, next) => {
				assert.equal(foo, 'foo', 'foo argument is correct');
				assert.equal(bar, 'bar', 'bar argument is correct');
				next(null, 'success');
			});

			const promise = fn('foo', 'bar');
			assert.ok(promise instanceof Promise, 'returns a Promise');

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

	describe('chainMiddleware (connect)', () => {
		let chainMiddleware;
		before(() => {
			chainMiddleware = rewire(CONNECT).__get__('chainMiddleware');
		});

		it('chains middleware onto a promise', () => {
			const middleware = (req, res, next) => next(null, 'notfoobar');
			const reducer = chainMiddleware({}, {});
			const promise = [middleware].reduce(reducer, Promise.resolve('foobar'));
			assert.ok(promise instanceof Promise, 'returns Promise');
			return promise.then(result => {
				assert.equal(result, 'notfoobar', 'got the result we expected');
			});
		});

		it('produces a catchable promise', done => {
			const middleware = (req, res, next) => next('error');
			const reducer = chainMiddleware({}, {});
			const promise = [middleware].reduce(reducer, Promise.resolve());
			assert.ok(promise instanceof Promise, 'returns Promise');
			promise.catch(err => {
				assert.equal(err, 'error', 'got the error');
				done();
			});
		});

		it('works with error handler middleware (exactly 4 args)', done => {
			const middleware1 = (req, res, next) => next({ message: 'error' });
			const middleware2 = (err, req, res, next) => {
				err.message = 'very bad error';
				next(err);
			};
			const reducer = chainMiddleware({}, {});
			[middleware1, middleware2].reduce(reducer, Promise.resolve()).catch(err => {
				assert.equal(err.message, 'very bad error', 'got the error');
				done();
			});
		});
	});
});

commonTests('connect-style middleware', CONNECT, () => [null, {}, {}]);

if (KOA_COMPAT) {
	require('./koa');
}
