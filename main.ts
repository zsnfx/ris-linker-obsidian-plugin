import { App, Plugin, PluginSettingTab, Setting, Editor, MarkdownView } from 'obsidian';
import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';

// --- PLUGIN INTERFACES ---
interface RisLinkerSettings {
    autoReplaceEnabled: boolean;
}

const DEFAULT_SETTINGS: RisLinkerSettings = {
    autoReplaceEnabled: true
}

// --- REGEX DEFINITIONS ---
// Pattern 1: ABGB § 1330 (Prefix)
const prefixRegex = /((?:\[\[|\[|<[^>]+>)?([a-zA-ZÄÖÜäöü-]+)(?:\]\]|\]|<[^>]+>)?)\s*(§|Art\.?)\s*(\d+[a-z]*)/g;
// Pattern 2: § 1330 ABGB (Postfix)
const postfixRegex = /(§|Art\.?)\s*(\d+[a-z]*)\s*((?:\[\[|\[|<[^>]+>)?([a-zA-ZÄÖÜäöü-]+)(?:\]\]|\]|<[^>]+>)?)/g;

function getRisUrl(law: string, type: string, num: string): string {
    const isArt = type.includes('Art');
    return `[https://www.ris.bka.gv.at/Ergebnis.wxe?Abfrage=Bundesnormen&Titel=$](https://www.ris.bka.gv.at/Ergebnis.wxe?Abfrage=Bundesnormen&Titel=$){law}&${isArt ? 'VonArtikel' : 'VonParagraf'}=${num}&${isArt ? 'BisArtikel' : 'BisParagraf'}=${num}`;
}

// --- MAIN PLUGIN CLASS ---
export default class RisLinkerPlugin extends Plugin {
    settings: RisLinkerSettings;

    async onload() {
        console.log("Loading RIS Linker");
        await this.loadSettings();

        // 1. Add Settings Tab
        this.addSettingTab(new RisLinkerSettingTab(this.app, this));

        // 2. Add Command Palette Action (Batch process entire file)
        this.addCommand({
            id: 'convert-all-ris-links',
            name: 'Convert all Austrian law citations in current file to RIS links',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.convertEntireFile(editor);
            }
        });

        // 3. Register the Live Typing Auto-Replacer
        this.registerEditorExtension(ViewPlugin.fromClass(class {
            plugin = this;
            update(update: ViewUpdate) {
                // @ts-ignore - access plugin instance via closure
                if (!window.risPluginInstance?.settings.autoReplaceEnabled || !update.docChanged) return;

                update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
                    const insertedString = inserted.toString();
                    if (insertedString !== ' ' && insertedString !== '\n') return;

                    const checkStart = Math.max(0, toB - 100);
                    const textToInspect = update.state.doc.sliceString(checkStart, toB);

                    // Check Prefix Pattern (ABGB § 1)
                    this.checkAndReplace(update, textToInspect, checkStart, fromB, prefixRegex, 2, 3, 4, 1);

                    // Check Postfix Pattern (§ 1 ABGB)
                    this.checkAndReplace(update, textToInspect, checkStart, fromB, postfixRegex, 4, 1, 2, 3);
                });
            }

            checkAndReplace(update: ViewUpdate, text: string, offset: number, cursor: number, regex: RegExp, lawIdx: number, symIdx: number, numIdx: number, fullWrapIdx: number) {
                regex.lastIndex = 0;
                let match;
                let lastMatch = null;
                while ((match = regex.exec(text)) !== null) lastMatch = match;

                if (lastMatch) {
                    const matchEnd = offset + lastMatch.index + lastMatch[0].length;
                    if (matchEnd === cursor) {
                        const law = lastMatch[lawIdx];
                        const sym = lastMatch[symIdx];
                        const num = lastMatch[numIdx];
                        const url = getRisUrl(law, sym, num);
                        const markdownLink = `[${lastMatch[0]}](${url})`;

                        setTimeout(() => {
                            update.view.dispatch({ changes: { from: matchEnd - lastMatch[0].length, to: matchEnd, insert: markdownLink } });
                        }, 0);
                    }
                }
            }
        }));

        // Store instance for the CodeMirror extension to access settings
        // @ts-ignore
        window.risPluginInstance = this;
    }

    onunload() {
        // @ts-ignore
        delete window.risPluginInstance;
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    // Function to batch process the whole file
    convertEntireFile(editor: Editor) {
        let content = editor.getValue();

        // Replace Prefix (ABGB § 1)
        content = content.replace(prefixRegex, (match, fullWrap, law, sym, num) => {
            // Ignore if already inside a markdown link
            if (match.includes('](')) return match;
            return `[${match}](${getRisUrl(law, sym, num)})`;
        });

        // Replace Postfix (§ 1 ABGB)
        content = content.replace(postfixRegex, (match, sym, num, fullWrap, law) => {
            if (match.includes('](')) return match;
            return `[${match}](${getRisUrl(law, sym, num)})`;
        });

        editor.setValue(content);
    }
}

// --- SETTINGS TAB UI ---
class RisLinkerSettingTab extends PluginSettingTab {
    plugin: RisLinkerPlugin;

    constructor(app: App, plugin: RisLinkerPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'RIS Auto Linker Settings' });

        new Setting(containerEl)
            .setName('Live Auto-Replace')
            .setDesc('Automatically convert citations into Markdown links as you type (triggers on space/enter).')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoReplaceEnabled)
                .onChange(async (value) => {
                    this.plugin.settings.autoReplaceEnabled = value;
                    await this.plugin.saveSettings();
                }));
    }
}