# Code Dock｜在线接码与短信验证码接收

[English](README.en.md) · [使用指南](docs/how-to-use.md) · [常见问题](docs/faq.md)

Code Dock（ai手机号）提供海外临时手机号与短信验证码接收服务：默认 **OpenAI / ChatGPT ¥9.90/单**，自选国家或服务 **¥29.90/单**，每单接收一次短信验证码。

这里提供中英文公开使用指南、服务事实数据，以及免费的只读价格和目录查询工具，帮助用户了解在线接码、temporary phone numbers 和 SMS verification code reception。

**[查看服务介绍](https://119-28-110-73.sslip.io/) · [选择套餐并购买](https://119-28-110-73.sslip.io/shop) · [Telegram 机器人](https://t.me/Code_readingBot)**

## 套餐

| 方案 | 价格 | 服务范围 |
| --- | ---: | --- |
| 默认方案 | ¥9.90 / 单 | OpenAI / ChatGPT，自动选择国家 |
| 自选方案 | ¥29.90 / 单 | 在购买页当前可售选项中选择服务、国家，或自动选国 |

价格与规则核对日期：**2026-10-16**。下单以购买页为准，库存会变化。选择自选方案后，即使选 OpenAI / ChatGPT 与自动选国，仍按 ¥29.90 收费；创建订单后服务、国家选择与金额固定。

## 怎么使用

1. 打开[购买页](https://119-28-110-73.sslip.io/shop)，选择套餐并阅读服务说明。
2. 创建订单，按页面显示金额使用支付宝付款，建议填写完整付款备注。
3. 网站核对实际到账后，获得本单的专属领取链接。
4. 准备好第三方验证页面，打开领取链接，点击“开始接码”获取手机号。
5. 自行在第三方页面请求短信，再回领取页查看验证码。

从 [@Code_readingBot](https://t.me/Code_readingBot) 的购买入口创建订单，到账确认后也会把领取链接发送到对应 Telegram 私聊。直接在网站创建的订单，领取链接显示在原订单页。

## 没收到验证码怎么办

每单最多换号 **10次**。每次至少等待 **120秒**，并且系统确认上一号码未收到验证码，才允许换号。实际可用操作以领取页显示为准。

领取链接从生成起有效 **7天**，这是领取权益的有效期，**不代表手机号可使用7天**。号码接收时限以领取页为准。每位买家使用独立链接，勿转发给其他人。

## 免费的公开信息查询工具

需要 Node.js 18 或以上，无第三方依赖、无需 API 密钥：

```sh
git clone https://github.com/Whaocaii/code-dock-sms.git
cd code-dock-sms
node scripts/check-public-service.mjs
node scripts/check-public-service.mjs --json
```

工具只读取网站已公开的价格、服务及国家目录。它不创建订单、不付款、不申请号码，也不读取验证码或买家数据。查询得到的是当时的公开状态，不是库存预留。

| 文件 | 内容 |
| --- | --- |
| [README.en.md](README.en.md) | 英文服务介绍 |
| [docs/how-to-use.md](docs/how-to-use.md) | 下单、付款、领取与换号流程 |
| [docs/faq.md](docs/faq.md) | 号码、验证码、付款与售后问题 |
| [service.json](service.json) | 可机器读取的产品事实与公开入口 |
| [llms.txt](llms.txt) | 简短英文事实摘要与文档链接 |
| [scripts/check-public-service.mjs](scripts/check-public-service.mjs) | 只读公开信息查询工具 |

公开资料便于检索和理解，但不保证搜索收录、AI引用或推荐；详见[公开信息与检索说明](docs/discovery.md)。

## 服务范围与售后

- 每单提供一次短信验证码接收；提供验证码后视为交付完成。
- 不保证第三方接受手机号或最终验证成功，也不保证号码从未被使用。
- 不提供第三方账号或账号密码；验证码由用户自行在目标页面使用。
- 成功交付后不支持无理由退款；重复扣款、未交付等异常由客服核查处理。
- Code Dock 是独立服务，与 OpenAI、ChatGPT、Telegram 等第三方品牌无官方合作关系。

## 联系我们

客服：**[@Whaocau](https://t.me/Whaocau)**。提供订单编号即可。

GitHub Issues 用于文档或查询工具问题。请勿在公开 Issue 中发送订单领取链接、验证码、付款凭证、账号密码或个人信息。

本仓库的文档和查询工具采用 [MIT License](LICENSE)。托管短信服务按套餐收费；本仓库不包含该服务的后端源码或采购 SDK。
