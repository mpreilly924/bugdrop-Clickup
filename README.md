# BugDrop 🐛

[![CI](https://github.com/mean-weasel/bugdrop/actions/workflows/ci.yml/badge.svg)](https://github.com/mean-weasel/bugdrop/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-1.11.0-14b8a6)](./CHANGELOG.md)
[![Security Policy](https://img.shields.io/badge/Security-Policy-blue)](./SECURITY.md)
[![Live Demo](https://img.shields.io/badge/Demo-Try_It_Live-ff9e64)](https://bugdrop-widget-test.vercel.app)
[![Product Hunt](https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1141615&theme=light&t=1778415221018)](https://www.producthunt.com/products/bugdrop-2?utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-bugdrop-2)

In-app feedback → ClickUp tasks. Screenshots, annotations, the works.

Featured on Product Hunt and ranked #6 Product of the Day on May 9, 2026.

![bugdrop-demo-small](https://github.com/user-attachments/assets/22d234fa-aa0f-4d01-bc4f-4c3e8f107165)

## Quick Start

**1. Configure ClickUp** on the Worker:

```sh
wrangler secret put CLICKUP_API_TOKEN
# Set CLICKUP_LIST_ID in wrangler.toml to the destination List ID.
```

**2. Add the script** to your website:

```html
<script src="https://bugdrop.neonwatty.workers.dev/widget.js"></script>
```

That's it! Users can now click the bug button to submit feedback as ClickUp tasks.

> **Important:** Do not add `async` or `defer` to the script tag — the widget needs synchronous loading to read its configuration.

> **CSP note:** If your site uses a Content Security Policy, add `https://bugdrop.neonwatty.workers.dev` to your `script-src` directive to enable the widget.

> **Security note:** BugDrop is not a spam or malware filtering service. Treat feedback and screenshots as unauthenticated user-generated content, and self-host behind your own WAF/CAPTCHA/content controls for stricter environments.

## Features

- 🔒 **Privacy masking** — tag sensitive elements with `data-bugdrop-mask` and BugDrop visually covers them in supported screenshot modes before submission. Passwords and credit-card inputs are masked automatically.

## Widget Options

| Attribute                       | Values                                               | Default               |
| ------------------------------- | ---------------------------------------------------- | --------------------- |
| `data-project`                  | Stable local browser key                             | Current host          |
| `data-theme`                    | `light`, `dark`, `auto`                              | `auto`                |
| `data-locale`                   | `en`, `nl`, `pl` (region subtags accepted)           | `<html lang>` or `en` |
| `data-position`                 | `bottom-right`, `bottom-left`                        | `bottom-right`        |
| `data-color`                    | Accent color for buttons/highlights (e.g. `#FF6B35`) | `#14b8a6` (teal)      |
| `data-label`                    | Any string                                           | localized label       |
| `data-button`                   | `true`, `false`                                      | `true`                |
| `data-send-console-logs`        | `true`, `false`                                      | `false`               |
| `data-element-context-max-area` | Viewport-area multiplier for Select Element context  | `0`                   |

See [full documentation](https://bugdrop.dev/docs/configuration) for all options including styling, submitter info, and dismissible button.

## Documentation

- [Full Documentation](https://bugdrop.dev/docs)
- [Built with BugDrop Showcase](https://bugdrop.dev/showcase)
- [Configuration](https://bugdrop.dev/docs/configuration)
- [Styling](https://bugdrop.dev/docs/styling)
- [JavaScript API](https://bugdrop.dev/docs/javascript-api)
- [Version Pinning](https://bugdrop.dev/docs/version-pinning)
- [CI Testing](https://bugdrop.dev/docs/ci-testing)
- [Security & Rate Limiting](https://bugdrop.dev/docs/security)
- [Self-Hosting](https://bugdrop.dev/docs/self-hosting)
- [FAQ](https://bugdrop.dev/docs/faq)

## How It Works

```
User clicks bug button → Widget captures screenshot → Worker creates a ClickUp task
```

1. **Widget** loads in a Shadow DOM (isolated from your page styles)
2. **Screenshot** captured client-side using html-to-image
3. **Worker** (Cloudflare) creates a task in the configured ClickUp List
4. **ClickUp API** attaches the screenshot and uploaded files directly to that task

## Live Demo

Try it on [WienerMatch](https://bugdrop-widget-test.vercel.app) — click the bug button in the bottom right corner.

## License

MIT
