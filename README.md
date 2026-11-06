# BrewPage Publisher for Obsidian

<p>
<a href="https://github.com/kochetkov-ma/brewpage-obsidian/releases/latest"><img height="18" alt="Release" src="https://img.shields.io/github/v/release/kochetkov-ma/brewpage-obsidian"></a>
<a href="https://community.obsidian.md/plugins/brewpage-publisher"><img height="18" alt="Obsidian community plugin" src="https://img.shields.io/badge/Obsidian-BrewPage%20Publisher-7c3aed"></a>
<a href="https://github.com/kochetkov-ma/brewpage-obsidian/blob/main/LICENSE"><img height="18" alt="License MIT" src="https://img.shields.io/badge/license-MIT-green"></a>
</p>

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

## Related

- [brewpage.app](https://brewpage.app): the hosting service; [API guide](https://brewpage.app/api); [OpenAPI docs](https://kochetkov-ma.github.io/brewpage-openapi/)
- [brewpage-openapi](https://github.com/kochetkov-ma/brewpage-openapi): OpenAPI contract and the `brewpage-mcp` MCP server ([npm](https://www.npmjs.com/package/brewpage-mcp))
- [brewpage-action](https://github.com/kochetkov-ma/brewpage-action): GitHub Action that publishes CI artifacts ([Marketplace](https://github.com/marketplace/actions/publish-to-brewpage))
- [brewpage-cookbook](https://github.com/kochetkov-ma/brewpage-cookbook): interactive recipes published on BrewPage
- [brewpage-browser-extension](https://github.com/kochetkov-ma/brewpage-browser-extension): browser extension that publishes pages, selections and files
- [brewpage-codex-plugin](https://github.com/kochetkov-ma/brewpage-codex-plugin): Codex plugin with the publishing skill and remote MCP
- [brewpage-publish-plugins](https://github.com/kochetkov-ma/brewpage-publish-plugins): publishing plugins for AI coding tools and the n8n node ([npm](https://www.npmjs.com/package/n8n-nodes-brewpage))
- [langchain-brewpage](https://github.com/kochetkov-ma/langchain-brewpage): LangChain tools ([PyPI](https://pypi.org/project/langchain-brewpage/))
- [llama-index-tools-brewpage](https://github.com/kochetkov-ma/llama-index-tools-brewpage): LlamaIndex tool spec ([PyPI](https://pypi.org/project/llama-index-tools-brewpage/))

Support: [info@brewpage.app](mailto:info@brewpage.app)

## License

MIT
