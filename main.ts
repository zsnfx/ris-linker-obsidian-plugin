import { App, Plugin, PluginSettingTab, Setting, Editor, MarkdownView } from 'obsidian';
import { ViewPlugin, ViewUpdate } from '@codemirror/view';

interface RisLinkerSettings {
    autoReplaceEnabled: boolean;
}

const DEFAULT_SETTINGS: RisLinkerSettings = {
    autoReplaceEnabled: true
}

// Matches: ABGB § 1330 OR ABGB §§ 6, 7 OR ABGB § 6 und 7
const prefixRegex = /((?:\[\[|\[|<[^>]+>)?([a-zA-ZÄÖÜäöü-]+)(?:\]\]|\]|<[^>]+>)?)\s*(§§?|Art\.?)\s*(\d+[a-z]*(?:\s*(?:,|und|&|-)\s*\d+[a-z]*)*)$/;

// Matches: § 1330 ABGB OR §§ 6, 7 ABGB OR § 6 und 7 ABGB
const postfixRegex = /(§§?|Art\.?)\s*(\d+[a-z]*(?:\s*(?:,|und|&|-)\s*\d+[a-z]*)*)\s*((?:\[\[|\[|<[^>]+>)?([a-zA-ZÄÖÜäöü-]+)(?:\]\]|\]|<[^>]+>)?)$/;

function getRisUrl(law: string, type: string, numString: string): string {
    const isArt = type.includes('Art');
    const paramType = isArt ? "Artikel" : "Paragraf";

    // Extract the FIRST continuous string of digits (and optional letters like 12a)
    // E.g., from "6, 7" it extracts "6". From "12a und 12b" it extracts "12a".
    const firstNumMatch = numString.match(/\d+[a-z]*/);
    const firstNum = firstNumMatch ? firstNumMatch[0] : numString;

    return "https://www.ris.bka.gv.at/Ergebnis.wxe?Abfrage=Bundesnormen&Titel=" + law + "&Von" + paramType + "=" + firstNum + "&Bis" + paramType + "=" + firstNum;
}

export default class RisLinkerPlugin extends Plugin {
    settings: RisLinkerSettings;

    async onload() {
        console.log("Loading RIS Linker");
        await this.loadSettings();

        this.addSettingTab(new RisLinkerSettingTab(this.app, this));

        this.addCommand({
            id: 'convert-all-ris-links',
            name: 'Convert all Austrian law citations in current file to RIS links',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.convertEntireFile(editor);
            }
        });

        this.registerEditorExtension(ViewPlugin.fromClass(class {
            plugin = this;
            update(update: ViewUpdate) {
                // @ts-ignore
                if (!window.risPluginInstance?.settings.autoReplaceEnabled || !update.docChanged) return;

                update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
                    const insertedString = inserted.toString();
                    if (insertedString !== ' ' && insertedString !== '\n') return;

                    const checkStart = Math.max(0, toB - 100);
                    // Slice exactly up to the space that was just typed
                    const textToInspect = update.state.doc.sliceString(checkStart, fromB);

                    // Check Prefix Pattern (ABGB § 1)
                    this.checkAndReplace(update, textToInspect, fromB, prefixRegex, 2, 3, 4);

                    // Check Postfix Pattern (§ 1 ABGB)
                    this.checkAndReplace(update, textToInspect, fromB, postfixRegex, 4, 1, 2);
                });
            }

            checkAndReplace(update: ViewUpdate, text: string, cursor: number, regex: RegExp, lawIdx: number, symIdx: number, numIdx: number) {
                const match = regex.exec(text);

                if (match) {
                    const fullMatch = match[0];
                    const law = match[lawIdx];
                    const sym = match[symIdx];
                    const num = match[numIdx];

                    const url = getRisUrl(law, sym, num);
                    const markdownLink = "[" + fullMatch + "](" + url + ")";

                    setTimeout(() => {
                        update.view.dispatch({
                            changes: {
                                from: cursor - fullMatch.length,
                                to: cursor,
                                insert: markdownLink
                            }
                        });
                    }, 0);
                }
            }
        }));

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

    convertEntireFile(editor: Editor) {
        let content = editor.getValue();

        // Replace Prefix globally
        content = content.replace(/((?:\[\[|\[|<[^>]+>)?([a-zA-ZÄÖÜäöü-]+)(?:\]\]|\]|<[^>]+>)?)\s*(§§?|Art\.?)\s*(\d+[a-z]*(?:\s*(?:,|und|&|-)\s*\d+[a-z]*)*)/g, (match, fullWrap, law, sym, num) => {
            if (match.includes('](')) return match;
            return "[" + match + "](" + getRisUrl(law, sym, num) + ")";
        });

        // Replace Postfix globally
        content = content.replace(/(§§?|Art\.?)\s*(\d+[a-z]*(?:\s*(?:,|und|&|-)\s*\d+[a-z]*)*)\s*((?:\[\[|\[|<[^>]+>)?([a-zA-ZÄÖÜäöü-]+)(?:\]\]|\]|<[^>]+>)?)/g, (match, sym, num, fullWrap, law) => {
            if (match.includes('](')) return match;
            return "[" + match + "](" + getRisUrl(law, sym, num) + ")";
        });

        editor.setValue(content);
    }
}

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
            .setDesc('Automatically convert citations into Markdown links as you type.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoReplaceEnabled)
                .onChange(async (value) => {
                    this.plugin.settings.autoReplaceEnabled = value;
                    await this.plugin.saveSettings();
                }));
    }
}