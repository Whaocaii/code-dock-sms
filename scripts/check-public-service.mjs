import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SOURCE_URLS = Object.freeze({
  config: 'https://119-28-110-73.sslip.io/api/site/config',
  catalog: 'https://119-28-110-73.sslip.io/api/site/catalog',
});
const ID = /^[a-z0-9][a-z0-9_-]{0,79}$/;
const MAX_BYTES = 131072;
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isPrice = value => Number.isSafeInteger(value) && value > 0 && value <= 100000000;
const cleanLabel = value => typeof value === 'string' && value.length <= 100
  ? value.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim() : '';
const failure = code => Object.assign(new Error(code), { code });

function configFields(data) {
  if (!isObject(data) || typeof data.ready !== 'boolean' || !isPrice(data.priceCents) ||
      (data.customEnabled !== undefined && typeof data.customEnabled !== 'boolean') ||
      (data.customPriceCents !== undefined && !isPrice(data.customPriceCents)) ||
      (data.customEnabled === true && !isPrice(data.customPriceCents))) throw failure('INVALID_FORMAT');
  return { ready: data.ready, defaultCents: data.priceCents, customEnabled: data.customEnabled === true,
    customCents: data.customPriceCents ?? null };
}

function catalogFields(data) {
  if (!isObject(data) || typeof data.enabled !== 'boolean' || typeof data.available !== 'boolean' ||
      !isPrice(data.customPriceCents) || !Array.isArray(data.services) || !Array.isArray(data.countries) ||
      data.services.length > 100 || data.countries.length > 300) throw failure('INVALID_FORMAT');
  const ids = new Set();
  const countries = data.countries.map(country => {
    if (!isObject(country) || typeof country.id !== 'string' || !ID.test(country.id) || country.id === 'auto' || ids.has(country.id) ||
        !cleanLabel(country.label)) throw failure('INVALID_FORMAT');
    ids.add(country.id);
    return { id: country.id, label: cleanLabel(country.label) };
  });
  const serviceIds = new Set();
  const services = data.services.map(service => {
    if (!isObject(service) || typeof service.id !== 'string' || !ID.test(service.id) || serviceIds.has(service.id) || !cleanLabel(service.title) ||
        !Array.isArray(service.countries) || !service.countries.length ||
        new Set(service.countries).size !== service.countries.length || service.countries.some(id => !ids.has(id))) {
      throw failure('INVALID_FORMAT');
    }
    serviceIds.add(service.id);
    return { id: service.id, title: cleanLabel(service.title), countryIds: [...service.countries] };
  });
  if (data.available && (!data.enabled || !services.length)) throw failure('INVALID_FORMAT');
  if (!data.available) return { enabled: data.enabled, available: false, customCents: data.customPriceCents, services: [], countries: [] };
  const offered = new Set(services.flatMap(service => service.countryIds));
  return { enabled: data.enabled, available: true, customCents: data.customPriceCents,
    services, countries: countries.filter(country => offered.has(country.id)) };
}

async function readPublic(source, fetchImpl, timeoutMs) {
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      (async () => {
        const response = await fetchImpl(SOURCE_URLS[source], { method: 'GET', redirect: 'error',
          credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
          headers: { Accept: 'application/json' }, signal: controller.signal });
        if (response.redirected || response.url && response.url !== SOURCE_URLS[source]) throw failure('REDIRECT_REFUSED');
        if (!Number.isInteger(response.status) || response.status < 200 || response.status >= 300) {
          throw failure(Number.isInteger(response.status) && response.status >= 100 && response.status <= 599
            ? `HTTP_${response.status}` : 'INVALID_FORMAT');
        }
        if (!/^application\/(?:[\w.-]+\+)?json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) throw failure('NON_JSON');
        if (Number(response.headers.get('content-length')) > MAX_BYTES) throw failure('INVALID_FORMAT');
        const text = await response.text();
        if (Buffer.byteLength(text, 'utf8') > MAX_BYTES) throw failure('INVALID_FORMAT');
        let data;
        try { data = JSON.parse(text); } catch { throw failure('INVALID_FORMAT'); }
        return source === 'config' ? configFields(data) : catalogFields(data);
      })(),
      new Promise((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(failure('TIMEOUT')); }, timeoutMs);
      }),
    ]);
  } catch (error) {
    if (controller.signal.aborted) throw failure('TIMEOUT');
    throw error;
  } finally { clearTimeout(timer); }
}

function publicIssue(source, error) {
  const code = typeof error?.code === 'string' && /^(?:TIMEOUT|NON_JSON|INVALID_FORMAT|REDIRECT_REFUSED|HTTP_[1-5][0-9]{2})$/.test(error.code)
    ? error.code : 'NETWORK_ERROR';
  const messages = { TIMEOUT: '请求超时，请稍后重试。', NON_JSON: '接口未返回 JSON，暂时无法确认。',
    INVALID_FORMAT: '公开信息格式异常，暂时无法确认。', REDIRECT_REFUSED: '接口发生跳转，已停止读取。',
    NETWORK_ERROR: '网络连接未成功，请稍后重试。' };
  return { source, code, message: messages[code] || `接口暂不可用（${code}）。` };
}

/** Read only the fixed public configuration and stock catalog. No purchase SDK. */
export async function checkPublicService({ fetchImpl = globalThis.fetch, timeoutMs = 8000, now = () => new Date() } = {}) {
  if (typeof fetchImpl !== 'function' || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) throw new TypeError('Invalid checker options');
  const results = await Promise.allSettled(['config', 'catalog'].map(source => readPublic(source, fetchImpl, timeoutMs)));
  const config = results[0].status === 'fulfilled' ? results[0].value : null;
  const catalog = results[1].status === 'fulfilled' ? results[1].value : null;
  const issues = results.flatMap((result, index) => result.status === 'rejected' ? [publicIssue(index === 0 ? 'config' : 'catalog', result.reason)] : []);
  const priceMismatch = config?.customCents !== null && config?.customCents !== undefined && catalog && config.customCents !== catalog.customCents;
  if (priceMismatch) issues.push({ source: 'catalog', code: 'PRICE_MISMATCH', message: '自选价格信息不一致，请以实际订单为准。' });
  return {
    sourceUrls: { ...SOURCE_URLS }, observedAt: new Date(now()).toISOString(),
    prices: { currency: 'CNY', defaultCents: config?.defaultCents ?? null,
      customCents: priceMismatch ? null : config?.customCents ?? catalog?.customCents ?? null },
    availability: { defaultPurchasable: config ? config.ready : null,
      customPurchasable: config ? config.ready && config.customEnabled && catalog?.enabled === true && catalog.available && !priceMismatch : null,
      catalogAvailable: catalog?.available === true },
    services: catalog?.services ?? [], countries: catalog?.countries ?? [], issues,
  };
}

export function formatPublicService(report) {
  const state = value => value === null ? '暂未确认' : value ? '当前可购买' : '暂不可购买';
  const price = cents => cents === null ? '暂未确认' : `¥${(cents / 100).toFixed(2)} / 单`;
  const countries = new Map(report.countries.map(country => [country.id, country.label]));
  const lines = ['Code Dock 公开服务检查（只读）', `检查时间：${report.observedAt}`,
    `默认方案：${state(report.availability.defaultPurchasable)} · ${price(report.prices.defaultCents)}`,
    `自选方案：${state(report.availability.customPurchasable)} · ${price(report.prices.customCents)}`];
  if (report.services.length) {
    lines.push('当前公开自选选项：');
    for (const service of report.services) lines.push(`- ${service.title}：${service.countryIds.map(id => countries.get(id)).join('、')}`);
  } else lines.push('当前没有已确认可售的自选服务或国家选项。');
  for (const issue of report.issues) lines.push(`提示（${issue.source === 'config' ? '服务配置' : '库存目录'}）：${issue.message}`);
  lines.push('状态与库存可能变化，下单时以购买页为准。本工具不创建订单、不购买号码。');
  return lines.join('\n') + '\n';
}

export async function main(args = process.argv.slice(2), options = {}) {
  const write = options.write ?? (text => process.stdout.write(text));
  if (args.length > 1 || args.length === 1 && args[0] !== '--json') {
    write('用法：node scripts/check-public-service.mjs [--json]\n'); return 2;
  }
  const report = await checkPublicService(options);
  write(args[0] === '--json' ? JSON.stringify(report, null, 2) + '\n' : formatPublicService(report));
  return report.issues.some(issue => issue.source === 'config') ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(code => { process.exitCode = code; }).catch(() => {
    process.stderr.write('公开服务检查未完成，请稍后重试。\n'); process.exitCode = 1;
  });
}
