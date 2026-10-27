"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => RisLinkerPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var import_view = require("@codemirror/view");
var DEFAULT_SETTINGS = {
  autoReplaceEnabled: true
};
var prefixRegex = /((?:\[\[|\[|<[^>]+>)?([a-zA-ZÄÖÜäöü-]+)(?:\]\]|\]|<[^>]+>)?)\s*(§|Art\.?)\s*(\d+[a-z]*)/g;
var postfixRegex = /(§|Art\.?)\s*(\d+[a-z]*)\s*((?:\[\[|\[|<[^>]+>)?([a-zA-ZÄÖÜäöü-]+)(?:\]\]|\]|<[^>]+>)?)/g;
function getRisUrl(law, type, num) {
  const isArt = type.includes("Art");
  return `[https://www.ris.bka.gv.at/Ergebnis.wxe?Abfrage=Bundesnormen&Titel=$](https://www.ris.bka.gv.at/Ergebnis.wxe?Abfrage=Bundesnormen&Titel=$){law}&${isArt ? "VonArtikel" : "VonParagraf"}=${num}&${isArt ? "BisArtikel" : "BisParagraf"}=${num}`;
}
var RisLinkerPlugin = class extends import_obsidian.Plugin {
  async onload() {
    console.log("Loading RIS Linker");
    await this.loadSettings();
    this.addSettingTab(new RisLinkerSettingTab(this.app, this));
    this.addCommand({
      id: "convert-all-ris-links",
      name: "Convert all Austrian law citations in current file to RIS links",
      editorCallback: (editor, view) => {
        this.convertEntireFile(editor);
      }
    });
    this.registerEditorExtension(import_view.ViewPlugin.fromClass(class {
      constructor() {
        this.plugin = this;
      }
      update(update) {
        if (!window.risPluginInstance?.settings.autoReplaceEnabled || !update.docChanged)
          return;
        update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
          const insertedString = inserted.toString();
          if (insertedString !== " " && insertedString !== "\n")
            return;
          const checkStart = Math.max(0, toB - 100);
          const textToInspect = update.state.doc.sliceString(checkStart, toB);
          this.checkAndReplace(update, textToInspect, checkStart, fromB, prefixRegex, 2, 3, 4, 1);
          this.checkAndReplace(update, textToInspect, checkStart, fromB, postfixRegex, 4, 1, 2, 3);
        });
      }
      checkAndReplace(update, text, offset, cursor, regex, lawIdx, symIdx, numIdx, fullWrapIdx) {
        regex.lastIndex = 0;
        let match;
        let lastMatch = null;
        while ((match = regex.exec(text)) !== null)
          lastMatch = match;
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
    window.risPluginInstance = this;
  }
  onunload() {
    delete window.risPluginInstance;
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  // Function to batch process the whole file
  convertEntireFile(editor) {
    let content = editor.getValue();
    content = content.replace(prefixRegex, (match, fullWrap, law, sym, num) => {
      if (match.includes("]("))
        return match;
      return `[${match}](${getRisUrl(law, sym, num)})`;
    });
    content = content.replace(postfixRegex, (match, sym, num, fullWrap, law) => {
      if (match.includes("]("))
        return match;
      return `[${match}](${getRisUrl(law, sym, num)})`;
    });
    editor.setValue(content);
  }
};
var RisLinkerSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "RIS Auto Linker Settings" });
    new import_obsidian.Setting(containerEl).setName("Live Auto-Replace").setDesc("Automatically convert citations into Markdown links as you type (triggers on space/enter).").addToggle((toggle) => toggle.setValue(this.plugin.settings.autoReplaceEnabled).onChange(async (value) => {
      this.plugin.settings.autoReplaceEnabled = value;
      await this.plugin.saveSettings();
    }));
  }
};
