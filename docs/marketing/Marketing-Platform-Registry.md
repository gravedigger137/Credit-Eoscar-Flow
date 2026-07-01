# Marketing Platform Registry

## Purpose
Track marketing platform assets without exposing credentials.

## Scope
Facebook, Instagram, LinkedIn, X, Threads, TikTok, Pinterest, Reddit, Discord, Telegram, YouTube, email marketing, SMS marketing, blog, SEO, Google Business Profile, and Notion.

## Owner
Marketing Operations Agent.

## Human Review Required
Regulated claims, financial claims, testimonials, affiliate disclosures, and customer data use.

## Security Notes
Track platform, handle, URL, owner entity, login custodian, MFA status, API readiness, campaign status, content ownership, and last audit date. Do not store passwords or recovery codes.

## Audit Requirements
Record ownership, MFA, API, campaign, and access changes.

## Related Routes
Future marketing admin routes only.

## Related Database Tables
`document_room_items`, `audit_events`.

## Go/No-Go Criteria
No campaign goes live without disclosure/compliance review.
