# Code Dock — Temporary Phone Numbers and SMS Verification Codes

[简体中文](README.md) · [Usage guide](docs/how-to-use.md) · [FAQ](docs/faq.md)

Code Dock provides temporary international phone numbers for receiving **one SMS verification code per order**. The default OpenAI / ChatGPT plan is **CNY 9.90**; country or service selection is **CNY 19.90**.

This repository provides public service documentation, machine-readable product facts, and a free tool for reading current public prices and service options.

**[Service information](https://119-28-110-73.sslip.io/) · [Choose a plan](https://119-28-110-73.sslip.io/shop) · [Telegram bot](https://t.me/Code_readingBot)**

## Plans

| Plan | Price | Scope |
| --- | ---: | --- |
| Default | CNY 9.90 / order | OpenAI / ChatGPT, with automatic country selection |
| Custom selection | CNY 19.90 / order | Choose a currently available service and country, or automatic country selection |

Prices and terms were checked on **2026-10-14**. The purchase page determines current options and availability. The custom plan remains CNY 19.90 when OpenAI / ChatGPT and automatic country selection are chosen. The service, country choice and amount are fixed after order creation.

## How it works

1. Open the purchase page, choose a plan and review the service terms.
2. Create an order and pay its displayed amount using Alipay. Including the full payment note helps match the payment.
3. After actual payment is verified, obtain your private claim link.
4. Prepare the third-party verification page, open the claim link and start receiving to obtain a number.
5. Request an SMS on the third-party page yourself, then return to the claim page to read the code.

Orders created through the Telegram bot purchase entry also receive their claim link in the associated private chat after payment confirmation. Direct website orders display the link on their original order page.

## Service rules

- One SMS verification code per order.
- Claim links are valid for 7 days from creation. This does not promise 7-day phone-number rental; the claim page shows the number's receiving time limit.
- Up to 10 replacements, each subject to a minimum 120-second wait and confirmation that the previous number received no code.
- Delivery is complete when a code is provided. Number acceptance and successful verification depend on the third party; numbers are not guaranteed to be unused.
- No change-of-mind refund after successful delivery. Duplicate charges and undelivered orders are reviewed by support.
- No account passwords or third-party accounts are provided. Code Dock is independent and has no official affiliation with the named platforms.

## Free public information tool

Node.js 18 or later is required. No dependencies or API key:

```sh
git clone https://github.com/Whaocaii/code-dock-sms.git
cd code-dock-sms
node scripts/check-public-service.mjs
node scripts/check-public-service.mjs --json
```

The tool only reads public pricing and service/country options. It cannot create orders, pay, purchase numbers, read verification codes, or access customer data. An availability response is not an inventory reservation.

## Machine-readable facts

- [service.json](service.json): dated product facts, prices, rules and public links.
- [llms.txt](llms.txt): a concise English summary and links to documentation.
- [Documentation for search and AI retrieval](docs/discovery.md): scope and information freshness.

These files make the information easier to inspect. They do not guarantee search indexing, model training, AI citations, or recommendations.

## Support and licensing

Support: [@Whaocau](https://t.me/Whaocau). Provide your order reference privately. Do not post claim links, codes, receipts, account credentials or personal data in public issues.

Repository documentation and the read-only tool use the [MIT License](LICENSE). The hosted SMS service is paid; its backend and a procurement SDK are not included here.
