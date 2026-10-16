import test from 'node:test';
import assert from 'node:assert/strict';
import { checkPublicService, formatPublicService, main, SOURCE_URLS } from '../scripts/check-public-service.mjs';

const config = { ready: true, priceCents: 990, customEnabled: true, customPriceCents: 2990 };
const catalog = { enabled: true, available: true, customPriceCents: 2990,
  services: [{ id: 'openai-chatgpt', title: 'OpenAI / ChatGPT', countries: ['greece', 'malaysia'] },
    { id: 'discord', title: 'Discord', countries: ['malaysia'] }],
  countries: [{ id: 'greece', label: '希腊' }, { id: 'malaysia', label: '马来西亚' }] };
const fixedTime = '2026-10-16T08:00:00.000Z';
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
const fixtures = (url) => Promise.resolve(json(url === SOURCE_URLS.config ? config : catalog));
const run = fetchImpl => checkPublicService({ fetchImpl, now: () => fixedTime });

test('uses only the two fixed public GET URLs, no credentials, body, or purchase side effects', async () => {
  const calls = [];
  const report = await run(async (url, options) => {
    calls.push({ url, options }); return fixtures(url);
  });
  assert.deepEqual(calls.map(call => call.url).sort(), Object.values(SOURCE_URLS).sort());
  for (const { url, options } of calls) {
    assert.equal(new URL(url).origin, 'https://119-28-110-73.sslip.io');
    assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'error');
    assert.equal(options.credentials, 'omit'); assert.equal(options.body, undefined);
    assert.deepEqual(options.headers, { Accept: 'application/json' });
    assert.ok(options.signal instanceof AbortSignal);
  }
  assert.equal(report.observedAt, fixedTime);
  assert.deepEqual(report.prices, { currency: 'CNY', defaultCents: 990, customCents: 2990 });
  assert.deepEqual(report.availability, { defaultPurchasable: true, customPurchasable: true, catalogAvailable: true });
  assert.deepEqual(report.services[1], { id: 'discord', title: 'Discord', countryIds: ['malaysia'] });
});

test('emits only whitelisted public fields, never raw order, token, or cost data', async () => {
  const report = await run(url => Promise.resolve(json(url === SOURCE_URLS.config ?
    { ...config, token: 'private-config-token', orders: ['private-order-id'], adminToken: 'private-admin-token' } :
    { ...catalog, maxPrice: 'private-cost', apiKey: 'private-api-key', services: catalog.services.map(service => ({ ...service, token: 'private-service-token' })) })));
  const output = JSON.stringify(report);
  assert.ok(!output.includes('private-')); assert.ok(!output.includes('maxPrice'));
  assert.deepEqual(Object.keys(report), ['sourceUrls', 'observedAt', 'prices', 'availability', 'services', 'countries', 'issues']);
});

test('Chinese display formats integer cents as two decimals and prints current service countries', async () => {
  const text = formatPublicService(await run(fixtures));
  assert.match(text, /默认方案：当前可购买 · ¥9\.90 \/ 单/);
  assert.match(text, /自选方案：当前可购买 · ¥29\.90 \/ 单/);
  assert.match(text, /Discord：马来西亚/); assert.match(text, /OpenAI \/ ChatGPT：希腊、马来西亚/);
});

test('catalog network failure preserves observed default price without inventing custom stock', async () => {
  const report = await run(url => url === SOURCE_URLS.config ? Promise.resolve(json(config)) : Promise.reject(new Error('secret-token-in-error')));
  assert.equal(report.availability.defaultPurchasable, true); assert.equal(report.availability.customPurchasable, false);
  assert.equal(report.prices.customCents, 2990); assert.deepEqual(report.services, []); assert.deepEqual(report.countries, []);
  assert.equal(report.issues[0].code, 'NETWORK_ERROR'); assert.ok(!JSON.stringify(report).includes('secret-token'));
  assert.match(formatPublicService(report), /没有已确认可售/);
});

test('an unavailable catalog never advertises retained or stale service choices', async () => {
  const report = await run(url => Promise.resolve(json(url === SOURCE_URLS.config ? config : { ...catalog, available: false })));
  assert.equal(report.availability.catalogAvailable, false); assert.deepEqual(report.services, []);
  assert.deepEqual(report.countries, []); assert.equal(report.issues.length, 0);
});

test('redirects fail closed even when a fetch implementation ignores redirect:error', async () => {
  let calls = 0;
  const report = await run(async () => { calls++; return { ...json(config), redirected: true, url: 'https://other.example/private' }; });
  assert.equal(calls, 2); assert.equal(report.availability.defaultPurchasable, null);
  assert.ok(report.issues.every(issue => issue.code === 'REDIRECT_REFUSED'));
  assert.ok(!JSON.stringify(report).includes('other.example'));
});

test('HTTP rejection, non-JSON and malformed data expose short safe issues without raw content', async () => {
  for (const [reply, code] of [
    [() => json({ error: { token: 'secret-http-detail' } }, 503), 'HTTP_503'],
    [() => new Response('<html>secret-login</html>', { headers: { 'Content-Type': 'text/html' } }), 'NON_JSON'],
    [() => new Response('{broken-secret', { headers: { 'Content-Type': 'application/json' } }), 'INVALID_FORMAT'],
    [() => json({ ...config, priceCents: '9.90' }), 'INVALID_FORMAT'],
  ]) {
    const report = await run(async () => reply());
    assert.equal(report.issues[0].code, code); assert.equal(report.prices.defaultCents, null);
    assert.ok(!JSON.stringify(report).includes('secret')); assert.deepEqual(report.services, []);
  }
});

test('timeout aborts both read-only requests, including an injected fetch that ignores cancellation', async () => {
  const signals = [];
  const report = await checkPublicService({ fetchImpl: async (_url, options) => {
    signals.push(options.signal); return new Promise(() => {});
  }, timeoutMs: 5, now: () => fixedTime });
  assert.equal(signals.length, 2); assert.ok(signals.every(signal => signal.aborted));
  assert.ok(report.issues.every(issue => issue.code === 'TIMEOUT'));
  assert.equal(report.prices.defaultCents, null); assert.equal(report.prices.customCents, null);
});

test('catalog country relationships and inconsistent custom prices are not treated as purchasable', async () => {
  const broken = await run(url => Promise.resolve(json(url === SOURCE_URLS.config ? config : {
    ...catalog, services: [{ id: 'discord', title: 'Discord', countries: ['unknown-country'] }],
  })));
  assert.deepEqual(broken.services, []); assert.equal(broken.issues[0].code, 'INVALID_FORMAT');
  const mismatch = await run(url => Promise.resolve(json(url === SOURCE_URLS.config ? config : { ...catalog, customPriceCents: 2000 })));
  assert.equal(mismatch.prices.customCents, null); assert.equal(mismatch.availability.customPurchasable, false);
  assert.equal(mismatch.issues[0].code, 'PRICE_MISMATCH');
});

test('missing or non-string catalog ids cannot be coerced into printable public options', async () => {
  for (const malformed of [
    { ...catalog, countries: [{ id: null, label: '错误国家' }], services: [{ id: 'discord', title: 'Discord', countries: [null] }] },
    { ...catalog, services: [{ title: '缺少 id', countries: ['malaysia'] }] },
  ]) {
    const report = await run(url => Promise.resolve(json(url === SOURCE_URLS.config ? config : malformed)));
    assert.deepEqual(report.services, []); assert.equal(report.availability.customPurchasable, false);
    assert.equal(report.issues[0].code, 'INVALID_FORMAT');
  }
});

test('--json prints the normalized schema; unsupported arguments make no request', async () => {
  let output = '', calls = 0;
  const options = { fetchImpl: async url => { calls++; return fixtures(url); }, now: () => fixedTime, write: text => { output += text; } };
  assert.equal(await main(['--json'], options), 0);
  assert.deepEqual(JSON.parse(output), await run(fixtures)); assert.equal(calls, 2);
  output = ''; assert.equal(await main(['https://untrusted.example'], options), 2);
  assert.equal(calls, 2); assert.match(output, /用法/);
});

test('CLI returns failure for unknown config but permits a useful report when only catalog is down', async () => {
  const write = () => {};
  assert.equal(await main([], { write, fetchImpl: async () => { throw new Error('no connection'); } }), 1);
  assert.equal(await main([], { write, fetchImpl: url => url === SOURCE_URLS.config ? Promise.resolve(json(config)) : Promise.reject(new Error('catalog offline')) }), 0);
});
