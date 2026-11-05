import { type App, type Editor, Notice, Plugin, PluginSettingTab, requestUrl, Setting, TFile } from 'obsidian';
import {
  DEFAULT_NAMESPACE,
  type Http,
  normalizeNamespace,
  noteFilename,
  prepareMarkdown,
  type Publication,
  publishMarkdown,
} from './api.ts';

interface BrewPageSettings {
  namespace: string;
  ownerToken: string;
  copyLink: boolean;
  publications: Record<string, Publication>;
}

const DEFAULT_SETTINGS: BrewPageSettings = {
  namespace: DEFAULT_NAMESPACE,
  ownerToken: '',
  copyLink: true,
  publications: {},
};

const http: Http = async (request) => {
  const response = await requestUrl({ ...request, contentType: request.headers['Content-Type'], throw: false });
  let json: unknown = null;
  try {
    json = response.json;
  } catch {
    json = null;
  }
  return { status: response.status, json };
};

export default class BrewPagePublisher extends Plugin {
  settings: BrewPageSettings = { ...DEFAULT_SETTINGS, publications: {} };

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addCommand({
      id: 'publish-note',
      name: 'Publish note',
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== 'md') return false;
        if (!checking) void this.publishNote(file);
        return true;
      },
    });
    this.addCommand({
      id: 'publish-selection',
      name: 'Publish selection',
      editorCheckCallback: (checking, editor: Editor, view) => {
        if (!editor.somethingSelected()) return false;
        if (!checking) void this.publishSelection(editor.getSelection(), view.file?.basename ?? 'selection');
        return true;
      },
    });
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        if (!(file instanceof TFile) || file.extension !== 'md') return;
        menu.addItem((item) =>
          item
            .setTitle('Publish to BrewPage')
            .setIcon('upload-cloud')
            .onClick(() => void this.publishNote(file)),
        );
      }),
    );
    this.registerEvent(
      this.app.vault.on('rename', (file, oldPath) => {
        const publication = this.settings.publications[oldPath];
        if (!publication) return;
        delete this.settings.publications[oldPath];
        this.settings.publications[file.path] = publication;
        void this.saveSettings();
      }),
    );
    this.addSettingTab(new BrewPageSettingTab(this.app, this));
  }

  async loadSettings(): Promise<void> {
    const data = (await this.loadData()) as Partial<BrewPageSettings> | null;
    this.settings = { ...DEFAULT_SETTINGS, ...data, publications: { ...data?.publications } };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private async publishNote(file: TFile): Promise<void> {
    const source = await this.app.vault.cachedRead(file);
    const existing = this.settings.publications[file.path];
    const result = await this.publish(prepareMarkdown(source), file.basename, existing);
    if (!result) return;
    this.settings.publications[file.path] = result;
    await this.saveSettings();
  }

  private async publishSelection(selection: string, basename: string): Promise<void> {
    await this.publish(prepareMarkdown(selection), `${basename} selection`);
  }

  private async publish(content: string, basename: string, existing?: Publication): Promise<Publication | null> {
    if (!content) {
      new Notice('Nothing to publish: the note is empty.');
      return null;
    }
    const working = new Notice('Publishing to BrewPage...', 0);
    try {
      const result = await publishMarkdown(
        {
          content,
          filename: noteFilename(basename),
          namespace: this.settings.namespace,
          ownerToken: this.settings.ownerToken,
          existing,
        },
        http,
      );
      if (!this.settings.ownerToken && result.ownerToken) this.settings.ownerToken = result.ownerToken;
      await this.saveSettings();
      working.hide();
      await this.announce(result.link, existing !== undefined && existing.id === result.id);
      return { namespace: result.namespace, id: result.id, link: result.link };
    } catch (error) {
      working.hide();
      new Notice(`BrewPage: ${error instanceof Error ? error.message : String(error)}`, 10000);
      return null;
    }
  }

  private async announce(link: string, updated: boolean): Promise<void> {
    let copied = false;
    if (this.settings.copyLink) {
      try {
        await navigator.clipboard.writeText(link);
        copied = true;
      } catch {
        copied = false;
      }
    }
    const fragment = createFragment((f) => {
      f.appendText(updated ? 'Updated on BrewPage: ' : 'Published to BrewPage: ');
      f.createEl('a', { text: link, href: link });
      if (copied) f.appendText(' (link copied)');
    });
    new Notice(fragment, 10000);
  }
}

class BrewPageSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: BrewPagePublisher,
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Namespace')
      .setDesc('Where new pages go. "my" (default) keeps them unlisted; "public" lists them in the BrewPage gallery and search engines.')
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_NAMESPACE)
          .setValue(this.plugin.settings.namespace)
          .onChange(async (value) => {
            const namespace = value.trim() === '' ? DEFAULT_NAMESPACE : normalizeNamespace(value);
            if (!namespace) return;
            this.plugin.settings.namespace = namespace;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('Owner token')
      .setDesc('Saved after the first publish; lets this vault update and manage its pages. Stored in this plugin\'s data file.')
      .addText((text) => {
        text.inputEl.type = 'password';
        text
          .setPlaceholder('Saved automatically')
          .setValue(this.plugin.settings.ownerToken)
          .onChange(async (value) => {
            this.plugin.settings.ownerToken = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Copy link after publishing')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.copyLink).onChange(async (value) => {
          this.plugin.settings.copyLink = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName('Forget published notes')
      .setDesc('Next publish of each note creates a new page instead of updating the old one.')
      .addButton((button) =>
        button.setButtonText('Forget').onClick(async () => {
          this.plugin.settings.publications = {};
          await this.plugin.saveSettings();
          new Notice('Published notes forgotten.');
        }),
      );
  }
}
