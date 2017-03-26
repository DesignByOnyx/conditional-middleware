'use strict';

const assert = require('chai').assert;
const rewire = require('rewire');
const commonTests = require('./common');

const KOA = '../src/koa';

describe('koa helpers', () => {
	describe('chainMiddleware (koa)', () => {
		let chainMiddleware;
		before(() => {
			chainMiddleware = rewire(KOA).__get__('chainMiddleware');
		});

		it('creates function wrappers for middleware function calls', async () => {
			const context = {};
			const middleware = (ctx, next) => {
				assert.equal(ctx, context, 'context is correct');
				return next();
			};
			const reducer = chainMiddleware(context);
			const mw = [middleware].reduce(reducer, () => 'DONE')
			assert.equal(await mw(), 'DONE');
		});
	});
});

commonTests('koa-style middleware', KOA, () => [null, {}]);
