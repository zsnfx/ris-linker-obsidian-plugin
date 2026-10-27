import { Plugin } from 'obsidian';
import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';

const lawRegex = /([a-zA-ZÄÖÜäöü-]+)\s*(§|Art\.?)\s*(\d+[a-z]*)/g;

function getRisUrl(law: string, type: string, num: string): string {
    const isArt = type.includes('Art');
    if (isArt) {
        return `https://www.ris.bka.gv.at/Ergebnis.wxe?Abfrage=Bundesnormen&Titel=${law}&VonArtikel=${num}&BisArtikel=${num}`;
    } else {
        return `https://www.ris.bka.gv.at/Ergebnis.wxe?Abfrage=Bundesnormen&Titel=${law}&VonParagraf=${num}&BisParagraf=${num}`;
    }
}

const risLivePreviewPlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
            this.decorations = this.buildDecorations(update.view);
        }
    }

    buildDecorations(view: EditorView) {
        const builder = new RangeSetBuilder<Decoration>();
        for (let { from, to } of view.visibleRanges) {
            const text = view.state.doc.sliceString(from, to);
            let match;
            while ((match = lawRegex.exec(text)) !== null) {
                const start = from + match.index;
                const end = start + match[0].length;
                const url = getRisUrl(match[1], match[2], match[3]);

                builder.add(start, end, Decoration.mark({
                    tagName: "a",
                    class: "cm-url",
                    attributes: { href: url, target: "_blank", rel: "noopener" }
                }));
            }
        }
        return builder.finish();
    }
}, {
    decorations: v => v.decorations
});

export default class RisLinkerPlugin extends Plugin {
    async onload() {
        this.registerEditorExtension(risLivePreviewPlugin);

        this.registerMarkdownPostProcessor((element) => {
            const textNodes: Text[] = [];
            const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
            let node;

            while (node = walker.nextNode()) {
                if (node.nodeValue && node.parentNode?.nodeName !== 'A' && node.parentNode?.nodeName !== 'CODE') {
                    textNodes.push(node as Text);
                }
            }

            for (const textNode of textNodes) {
                const text = textNode.nodeValue || '';
                let match;
                let lastIndex = 0;
                const fragment = document.createDocumentFragment();
                let found = false;

                lawRegex.lastIndex = 0;

                while ((match = lawRegex.exec(text)) !== null) {
                    found = true;
                    const url = getRisUrl(match[1], match[2], match[3]);

                    fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));

                    const a = document.createElement('a');
                    a.href = url;
                    a.className = 'external-link';
                    a.target = '_blank';
                    a.rel = 'noopener';
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
}