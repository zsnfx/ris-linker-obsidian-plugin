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
var prefixRegex = /((?:\[\[|\[|<[^>]+>)?([a-zA-Zäöüß-]*[A-ZÄÖÜ][a-zA-Zäöüß-]*)(?:\]\]|\]|<[^>]+>)?)\s*(§§?|Art\.?)\s*(\d+[a-z]*(?:\s*(?:,|und|&|-)\s*\d+[a-z]*)*)$/;
var postfixRegex = /(§§?|Art\.?)\s*(\d+[a-z]*(?:\s*(?:,|und|&|-)\s*\d+[a-z]*)*)\s*((?:\[\[|\[|<[^>]+>)?([a-zA-Zäöüß-]*[A-ZÄÖÜ][a-zA-Zäöüß-]*)(?:\]\]|\]|<[^>]+>)?)$/;
function getRisUrl(law, type, numString) {
  const isArt = type.includes("Art");
  const paramType = isArt ? "Artikel" : "Paragraf";
  const firstNumMatch = numString.match(/\d+[a-z]*/);
  const firstNum = firstNumMatch ? firstNumMatch[0] : numString;
  return "https://www.ris.bka.gv.at/Ergebnis.wxe?Abfrage=Bundesnormen&Titel=" + law + "&Von" + paramType + "=" + firstNum + "&Bis" + paramType + "=" + firstNum;
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
          const textToInspect = update.state.doc.sliceString(checkStart, fromB);
          this.checkAndReplace(update, textToInspect, fromB, prefixRegex, 2, 3, 4);
          this.checkAndReplace(update, textToInspect, fromB, postfixRegex, 4, 1, 2);
        });
      }
      checkAndReplace(update, text, cursor, regex, lawIdx, symIdx, numIdx) {
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
  convertEntireFile(editor) {
    let content = editor.getValue();
    content = content.replace(/((?:\[\[|\[|<[^>]+>)?([a-zA-Zäöüß-]*[A-ZÄÖÜ][a-zA-Zäöüß-]*)(?:\]\]|\]|<[^>]+>)?)\s*(§§?|Art\.?)\s*(\d+[a-z]*(?:\s*(?:,|und|&|-)\s*\d+[a-z]*)*)/g, (match, fullWrap, law, sym, num) => {
      if (match.includes("]("))
        return match;
      return "[" + match + "](" + getRisUrl(law, sym, num) + ")";
    });
    content = content.replace(/(§§?|Art\.?)\s*(\d+[a-z]*(?:\s*(?:,|und|&|-)\s*\d+[a-z]*)*)\s*((?:\[\[|\[|<[^>]+>)?([a-zA-Zäöüß-]*[A-ZÄÖÜ][a-zA-Zäöüß-]*)(?:\]\]|\]|<[^>]+>)?)/g, (match, sym, num, fullWrap, law) => {
      if (match.includes("]("))
        return match;
      return "[" + match + "](" + getRisUrl(law, sym, num) + ")";
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
    new import_obsidian.Setting(containerEl).setName("Live Auto-Replace").setDesc("Automatically convert citations into Markdown links as you type.").addToggle((toggle) => toggle.setValue(this.plugin.settings.autoReplaceEnabled).onChange(async (value) => {
      this.plugin.settings.autoReplaceEnabled = value;
      await this.plugin.saveSettings();
    }));
  }
};
