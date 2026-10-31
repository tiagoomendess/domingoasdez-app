import { describe, expect, it } from 'vitest';
import { clientAddress, loggedPath, requestEntry, type RequestSummary } from './request-log';

const request: RequestSummary = {
	requestId: 'r1',
	method: 'GET',
	path: '/jogos/123',
	route: '/jogos/[id=id]',
	status: 200,
	durationMs: 34,
	userId: 7
};

describe('requestEntry', () => {
	it('logs requests at info level with the summary as fields', () => {
		expect(requestEntry(request)).toEqual({
			level: 'info',
			message: 'GET /jogos/123 200 34ms',
			fields: request
		});
		expect(requestEntry({ ...request, status: 404, route: null }).level).toBe('info');
	});

	it('logs server errors at error level', () => {
		expect(requestEntry({ ...request, status: 500 }).level).toBe('error');
		expect(requestEntry({ ...request, route: '/healthz', status: 503 }).level).toBe('error');
	});

	it('keeps the uptime checks at debug level', () => {
		expect(requestEntry({ ...request, path: '/healthz', route: '/healthz' }).level).toBe('debug');
	});
});

describe('loggedPath', () => {
	it('logs the path without the query string', () => {
		const url = new URL('https://domingoasdez.com/jogadores/12/joao-silva?tab=golos');
		expect(
			loggedPath({
				url,
				route: { id: '/jogadores/[id=id]/[slug]' },
				params: { id: '12', slug: 'joao-silva' }
			})
		).toBe('/jogadores/12/joao-silva');
	});

	it('logs the route instead of emails and tokens', () => {
		const url = new URL('https://domingoasdez.com/conta/registar/verificar/a%40b.pt/abc123');
		expect(
			loggedPath({
				url,
				route: { id: '/conta/registar/verificar/[email]/[token]' },
				params: { email: 'a@b.pt', token: 'abc123' }
			})
		).toBe('/conta/registar/verificar/[email]/[token]');
	});
});

describe('clientAddress', () => {
	it('returns the address', () => {
		expect(clientAddress({ getClientAddress: () => '203.0.113.7' })).toBe('203.0.113.7');
	});

	it('returns nothing when the address header is missing', () => {
		const getClientAddress = () => {
			throw new Error('Address header was specified with ADDRESS_HEADER=CF-Connecting-IP');
		};
		expect(clientAddress({ getClientAddress })).toBeUndefined();
	});
});
