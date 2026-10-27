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
var lawRegex = /([a-zA-ZÄÖÜäöü-]+)\s*(§|Art\.?)\s*(\d+[a-z]*)/g;
function getRisUrl(law, type, num) {
  const isArt = type.includes("Art");
  if (isArt) {
    return `https://www.ris.bka.gv.at/Ergebnis.wxe?Abfrage=Bundesnormen&Titel=${law}&VonArtikel=${num}&BisArtikel=${num}`;
  } else {
    return `https://www.ris.bka.gv.at/Ergebnis.wxe?Abfrage=Bundesnormen&Titel=${law}&VonParagraf=${num}&BisParagraf=${num}`;
  }
}
var autoReplacePlugin = import_view.ViewPlugin.fromClass(class {
  update(update) {
    if (!update.docChanged)
      return;
    update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
      if (inserted.length === 0)
        return;
      const insertedString = inserted.toString();
      if (insertedString !== " " && insertedString !== "\n")
        return;
      const checkStart = Math.max(0, toB - 50);
      const textToInspect = update.state.doc.sliceString(checkStart, toB);
      lawRegex.lastIndex = 0;
      let match;
      let lastMatch = null;
      while ((match = lawRegex.exec(textToInspect)) !== null) {
        lastMatch = match;
      }
      if (lastMatch) {
        const matchEndIndexInState = checkStart + lastMatch.index + lastMatch[0].length;
        if (matchEndIndexInState === fromB) {
          const law = lastMatch[1];
          const symbol = lastMatch[2];
          const num = lastMatch[3];
          const originalText = lastMatch[0];
          const url = getRisUrl(law, symbol, num);
          const markdownLink = `[${originalText}](${url})`;
          setTimeout(() => {
            update.view.dispatch({
              changes: {
                from: matchEndIndexInState - originalText.length,
                to: matchEndIndexInState,
                insert: markdownLink
              }
            });
          }, 0);
        }
      }
    });
  }
});
var RisLinkerPlugin = class extends import_obsidian.Plugin {
  async onload() {
    console.log("Loading RIS Linker (Hard Markdown Replacer)");
    this.registerEditorExtension(autoReplacePlugin);
  }
  onunload() {
    console.log("Unloading RIS Linker");
  }
};
