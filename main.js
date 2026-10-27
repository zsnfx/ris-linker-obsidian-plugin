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
var import_state = require("@codemirror/state");
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
var risLivePreviewPlugin = import_view.ViewPlugin.fromClass(class {
  constructor(view) {
    this.decorations = this.buildDecorations(view);
  }
  update(update) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.buildDecorations(update.view);
    }
  }
  buildDecorations(view) {
    const builder = new import_state.RangeSetBuilder();
    for (let { from, to } of view.visibleRanges) {
      const text = view.state.doc.sliceString(from, to);
      let match;
      while ((match = lawRegex.exec(text)) !== null) {
        const start = from + match.index;
        const end = start + match[0].length;
        const url = getRisUrl(match[1], match[2], match[3]);
        builder.add(start, end, import_view.Decoration.mark({
          tagName: "a",
          class: "cm-url",
          attributes: { href: url, target: "_blank", rel: "noopener" }
        }));
      }
    }
    return builder.finish();
  }
}, {
  decorations: (v) => v.decorations
});
var RisLinkerPlugin = class extends import_obsidian.Plugin {
  async onload() {
    this.registerEditorExtension(risLivePreviewPlugin);
    this.registerMarkdownPostProcessor((element) => {
      const textNodes = [];
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
      let node;
      while (node = walker.nextNode()) {
        if (node.nodeValue && node.parentNode?.nodeName !== "A" && node.parentNode?.nodeName !== "CODE") {
          textNodes.push(node);
        }
      }
      for (const textNode of textNodes) {
        const text = textNode.nodeValue || "";
        let match;
        let lastIndex = 0;
        const fragment = document.createDocumentFragment();
        let found = false;
        lawRegex.lastIndex = 0;
        while ((match = lawRegex.exec(text)) !== null) {
          found = true;
          const url = getRisUrl(match[1], match[2], match[3]);
          fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
          const a = document.createElement("a");
          a.href = url;
          a.className = "external-link";
          a.target = "_blank";
          a.rel = "noopener";
          a.textContent = match[0];
          fragment.appendChild(a);
          lastIndex = lawRegex.lastIndex;
        }
        if (found) {
          fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
          textNode.parentNode?.replaceChild(fragment, textNode);
        }
      }
    });
  }
};
