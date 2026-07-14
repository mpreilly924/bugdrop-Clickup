# Terms of Service

**Last updated:** February 2025

## Overview

BugDrop is a free, open-source feedback widget that creates ClickUp tasks with screenshots. These terms apply to the hosted service at `bugdrop.neonwatty.workers.dev`. If you self-host BugDrop, these terms do not apply to your instance.

## Use of the Service

- BugDrop is provided **free of charge** with no guarantees of uptime or availability.
- You may use the hosted widget on any website where you have authority to add scripts.
- You must have a ClickUp List configured as the destination for the worker you point the widget at.
- Do not use the service to submit spam, abusive content, or illegal material via ClickUp tasks.
- The hosted service is not a spam, malware, or content moderation service. Feedback submissions are unauthenticated user-generated content.

## No Warranty

THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. THE AUTHORS ARE NOT LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY ARISING FROM USE OF THE SERVICE.

## Rate Limits

The service enforces rate limits (20 requests per IP per 15 minutes) to prevent abuse and protect ClickUp API quotas. Exceeding these limits will result in temporary throttling.

For stricter security or compliance requirements, self-host BugDrop and apply your own WAF, CAPTCHA, logging, retention, and content filtering controls.

## ClickUp

BugDrop interacts with ClickUp on your behalf using a ClickUp API token configured by the worker owner. Your use of ClickUp is subject to [ClickUp's Terms of Service](https://clickup.com/legal/terms-of-service). BugDrop uses the token only to create tasks and upload attachments in the configured destination List.

## Open Source

BugDrop is licensed under the [MIT License](./LICENSE). You are free to self-host, modify, and distribute it under the terms of that license.

## Changes

These terms may be updated from time to time. Changes will be reflected in this file in the repository.

## Contact

For questions, open an issue at [github.com/mean-weasel/bugdrop](https://github.com/mean-weasel/bugdrop).
