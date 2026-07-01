# Upload Security

## Overview

Uploads are restricted by size, extension, MIME type, authentication, and path safety.

## Purpose

Reduce risk from unsafe customer documents, bureau reports, executable files, path traversal, and accidental public exposure.

## Architecture

- Uploads use Multer with a configurable `UPLOAD_MAX_BYTES` limit.
- Default maximum size is 25 MB.
- Archive uploads are disabled unless `ALLOW_ARCHIVE_UPLOADS=true`.
- Extension and MIME type must both match the approved list.
- Magic-byte validation is enforced where practical for PDF, images, ZIP-based Office files, and archives.
- `MALWARE_SCAN_COMMAND` can run an external scanner; if unset, scan status is reported as not configured.
- Upload, download, and delete operations create compliance audit notifications.
- Download and delete paths are resolved inside the configured upload directory.
- Production should use private object storage or a persistent private volume, not source control.

## Dependencies

- `UPLOAD_MAX_BYTES`
- `ALLOW_ARCHIVE_UPLOADS`
- `MALWARE_SCAN_PROVIDER`
- `MALWARE_SCAN_COMMAND`
- `MALWARE_SCAN_TIMEOUT_MS`
- `PRIVATE_UPLOAD_STORAGE`
- `SIGNED_DOWNLOAD_URLS_ENABLED`

## Folder Structure

- `server/routes.ts`
- `.env.example`
- `uploads/` for local development only

## Security

Still required before real-user production:

- Malware scanning provider installation/configuration and test evidence.
- Private object storage.
- Signed download URLs where externally delivered.
- Durable audit log retention for uploads/downloads/deletes.
- Retention and deletion policy for PII and bureau data.

## Maintenance

Review file types quarterly. Keep uploaded PII out of Git, build artifacts, logs, screenshots, and public object storage.

## Related Documentation

- `docs/Production-Security-Checklist.md`
- `docs/security/Secret-Management.md`
- `DisasterRecovery.md`
