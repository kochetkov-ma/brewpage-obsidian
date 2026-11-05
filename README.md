# BrewPage Publisher for Obsidian

Publish the current note, or the selected text, to [BrewPage](https://brewpage.app) as a styled web page and get a shareable link.

## Commands

- **Publish note**: publishes the active Markdown note. Publishing the same note again updates the same page and keeps its link.
- **Publish selection**: publishes the selected text as a new page.
- **Publish to BrewPage** in the file menu (right-click a note).

After publishing, a notice shows the link and, by default, copies it to the clipboard.

Before sending, the plugin removes the YAML frontmatter, `%% comments %%` and `![[embeds]]`, and turns `[[wikilinks]]` into plain text, because they only make sense inside your vault. Images and attachments are not uploaded.

## Settings

- **Namespace** (default `my`): `my` keeps pages unlisted; anyone with the link can still open them. `public` lists pages in the BrewPage gallery and search engines, so never use it for private notes.
- **Owner token**: saved automatically after the first publish. It lets this vault update its pages and lets you manage them on brewpage.app. It is stored in the plugin's `data.json` inside your vault's `.obsidian/plugins/brewpage-publisher/` folder; treat it like a password.
- **Copy link after publishing** (default on).
- **Forget published notes**: the next publish creates new pages instead of updating old ones.

## Network use

This plugin sends data over the network only when you run one of its commands:

- Service: BrewPage, `https://brewpage.app` (API: `POST /api/html`, `PUT /api/html/{namespace}/{id}`).
- Data sent: the note or selection content (after the cleanup above), the note name as the page file name, the namespace and your owner token.
- No account is needed; publishing is free. Pages expire after the BrewPage default retention period unless extended on brewpage.app.
- No telemetry, analytics or background requests. No remote code is loaded.
- Privacy policy: <https://brewpage.app/privacy>. Terms: <https://brewpage.app/terms>.

## Install

From Obsidian: Settings -> Community plugins -> Browse -> search "BrewPage Publisher" (after directory approval).

Manually: download `main.js` and `manifest.json` from the [latest release](https://github.com/kochetkov-ma/brewpage-obsidian/releases/latest) into `<vault>/.obsidian/plugins/brewpage-publisher/`, then enable the plugin.

## Development

```bash
npm ci
npm test        # node --test (Node 22.18+ strips TypeScript types natively)
npm run build   # tsc --noEmit + esbuild -> main.js (unminified)
```

Releases are tagged with the exact `manifest.json` version (for example `1.0.0`) and carry `main.js` and `manifest.json`.

## License

MIT
