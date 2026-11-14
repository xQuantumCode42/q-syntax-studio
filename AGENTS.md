# Project instructions

## Releases

- The user controls when a new release is created. Do not increment the version or create additional release/review directories unless the user explicitly requests it.
- Maintain the initial version at `0.1.0`, with a single deliverable directory: `release/0.1.0/`.
- Authorized fixes can rebuild and replace that initial deliverable. Put temporary packaging/validation output under ignored `.tools/`, not under `release/`.
- Keep the root `Syntax Studio.lnk` pointing at the canonical executable. Preserve user progress and account data during rebuilds and cleanup.

## Desktop experience

- Prioritize space for the lesson and editor over decorative headers. Keep the language selector compact and scalable.
- The learning workspace must fit within the window, with scrolling inside its panels rather than the entire page.
- Check desktop layouts at 1366×768, 1100×680 and 1000×600 content sizes; keep primary execution and navigation controls reachable.
