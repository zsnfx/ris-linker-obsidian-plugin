import { Plugin } from 'obsidian';
import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';

// Regular expression to match "Law § Number" or "Law Art Number"
// We use the 'g' flag to find it, but we will test it against the text immediately typed.
const lawRegex = /([a-zA-ZÄÖÜäöü-]+)\s*(§|Art\.?)\s*(\d+[a-z]*)/g;

// Helper function to generate the RIS URL
function getRisUrl(law: string, type: string, num: string): string {
    const isArt = type.includes('Art');
    if (isArt) {
        return `https://www.ris.bka.gv.at/Ergebnis.wxe?Abfrage=Bundesnormen&Titel=${law}&VonArtikel=${num}&BisArtikel=${num}`;
    } else {
        return `https://www.ris.bka.gv.at/Ergebnis.wxe?Abfrage=Bundesnormen&Titel=${law}&VonParagraf=${num}&BisParagraf=${num}`;
    }
}

// CodeMirror Extension that watches for typing and replaces text
const autoReplacePlugin = ViewPlugin.fromClass(class {
    update(update: ViewUpdate) {
        // Only run if the document actually changed
        if (!update.docChanged) return;

        // Iterate through all changes in this transaction
        update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
            // We only care about text being inserted (typing)
            if (inserted.length === 0) return;

            // Get the text just typed. We want to trigger when the user types a space or newline
            // AFTER typing a citation.
            const insertedString = inserted.toString();
            if (insertedString !== ' ' && insertedString !== '\n') return;

            // Look at the text immediately preceding the space/newline
            // We grab the last 50 characters to ensure we capture the whole citation
            const checkStart = Math.max(0, toB - 50);
            const textToInspect = update.state.doc.sliceString(checkStart, toB);

            // Reset regex state
            lawRegex.lastIndex = 0;
            let match;
            let lastMatch = null;

            // Find the last match in the string
            while ((match = lawRegex.exec(textToInspect)) !== null) {
                lastMatch = match;
            }

            if (lastMatch) {
                // Ensure the match is exactly what precedes the space/newline we just typed.
                // We check if the match ends exactly where the space was inserted.
                const matchEndIndexInState = checkStart + lastMatch.index + lastMatch[0].length;

                if (matchEndIndexInState === fromB) {
                    const law = lastMatch[1];
                    const symbol = lastMatch[2];
                    const num = lastMatch[3];

                    const originalText = lastMatch[0];
                    const url = getRisUrl(law, symbol, num);
                    const markdownLink = `[${originalText}](${url})`;

                    // Dispatch a new transaction to replace the raw text with the Markdown link
                    // setTimeout is required to avoid dispatching a transaction inside an update cycle
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

export default class RisLinkerPlugin extends Plugin {
    async onload() {
        console.log("Loading RIS Linker (Hard Markdown Replacer)");

        // Register the auto-replacer extension
        this.registerEditorExtension(autoReplacePlugin);
    }

    onunload() {
        console.log("Unloading RIS Linker");
    }
}