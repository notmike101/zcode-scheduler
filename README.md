# ZCode Scheduler

Scheduler is an extension for [ZCode Desktop Extensions](https://github.com/notmike101/zcode-extensions). It creates timezone-aware recurring ZCode tasks while the desktop app is open.

Scheduled runs are ordinary persistent ZCode tasks. They appear immediately in the normal sidebar as `⏰ Job name`, can be opened while they run, remain available after completion, and archive like any other task.

## Requirements

- ZCode Desktop Extensions 0.2.0 or newer
- ZCode 3.3.6 or newer
- Windows

## Install

Open **Extensions → Available** in ZCode and install Scheduler. The host verifies the release archive checksum before staging it. New installs and updates take effect on the next ZCode launch.

Manual installation is also supported: download `zcode-scheduler-v0.1.5.zip` from the [latest release](https://github.com/notmike101/zcode-scheduler/releases/latest), extract the `scheduler` folder, and select it from **Extensions → Installed → Install folder**.

## Scheduling behavior

- Uses standard five-field cron expressions: minute, hour, day, month, weekday.
- Stores an IANA timezone with every job.
- Runs only while ZCode is open; missed runs are skipped.
- Supports skip, queue-one, and bounded parallel overlap policies.
- Keeps job definitions and run history in the extension's private data directory.
- Backfills retained pre-0.1.3 run sessions into the native task sidebar once when their workspace can be resolved.

## Development

```powershell
bun install
bun run check
bun run release:package -- --tag v0.1.5
```

The release command writes a ZIP, its SHA-256 checksum, and `extension-update.json` to `dist/release`.

## License

MIT
