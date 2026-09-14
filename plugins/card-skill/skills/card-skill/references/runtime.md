# Installation and runtime

Use this reference for an incomplete install, missing dependencies, update notices, or the post-delivery update. Rendering and checks stay local; update checks never upload card content.

## Installation integrity

The skill directory must contain `scripts/card.js`, `scripts/check-output.mjs`, `assets/`, `schemas/`, and `references/`. A bare repository-root skill install can contain only SKILL.md. If incomplete, report the missing entries and reinstall the self-contained package using the host's supported path:

```bash
# Codex plugin
codex plugin marketplace add KKenny0/card-skill
codex plugin add card-skill@card-skill

# Claude Code plugin
claude plugin marketplace add KKenny0/card-skill
claude plugin install card-skill@card-skill

# Generic agent
npx skills add KKenny0/card-skill/plugins/card-skill/skills/card-skill -a codex -g -y
```

For one-off use: `npx skills use KKenny0/card-skill/plugins/card-skill/skills/card-skill --skill card-skill`.

## Dependencies

The CLI checks the declared runtime before rendering. If dependencies are missing, run these commands from the installed skill directory, then retry the original job:

```bash
node scripts/setup-runtime.mjs
node scripts/setup-runtime.mjs --check
```

Setup installs the declared npm packages locally and Playwright Chromium in the normal user cache. Report setup failures; never bypass the output checks. Runtime preparation is separate from the one content/visual revision budget.

## Updates

The CLI checks for updates defensively; do not duplicate this check before every renderer call. For a user-requested direction preview that has not invoked the CLI, run `node scripts/check-update.mjs` once. Relay any update notice and continue the current task with the current installation.

After the reviewed output has been delivered, run:

```bash
node scripts/check-update.mjs --auto-update
```

The v3 candidate workflow does not perform its post-job upgrade before review/publication. Direct `card.js` calls launch their supported post-render upgrade themselves.

Supported Codex and generic `skills` installs update to the commit resolved from the latest stable Release, read back the version, and prepare dependencies for the next use. Per-install state, daily caching, and locks prevent duplicate checks and racing updates; failed installation or runtime preparation restores the previous copy. Checks read GitHub's public Release and commit APIs; upgrades download through Codex, a pinned skills CLI, or the native marketplace. No article, prompt, path, or image is uploaded.

Claude Code installations remain under its native updater:

```bash
claude plugin marketplace update card-skill
claude plugin update card-skill@card-skill
```

`CARD_SKILL_DISABLE_UPDATE_CHECK=1` disables checks and automatic upgrades. `CARD_SKILL_DISABLE_AUTO_UPDATE=1` keeps notices but disables automatic upgrades. Never switch versions in the middle of a visual job.
