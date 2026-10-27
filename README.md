# RIS Auto Linker for Obsidian

**RIS Auto Linker** is an Obsidian plugin designed specifically for Austrian law. It automatically detects Austrian legal citations (like `ABGB § 1330` or `B-VG Art 7`) in your notes as you type, instantly converting them into standard Markdown links that direct you straight to the official [RIS (Rechtsinformationssystem des Bundes)](https://www.ris.bka.gv.at/) database.

Unlike visual-only plugins, this physically alters your raw `.md` file, ensuring your legal citations remain hyperlinked when exported to PDF, synced to mobile, or viewed in other text editors.

## ✨ Features

- **Live Auto-Replace:** Type `ABGB § 1330` and hit space—the plugin instantly converts it to a permanent Markdown link `[ABGB § 1330](https://...)`.
- **Supports Prefix & Postfix Citation:** Recognizes both `ABGB § 1` and `§ 1 ABGB`.
- **Supports Paragraph & Article Lists:** Properly handles multiple paragraphs and ranges like `ABGB §§ 6, 7` or `ABGB § 6 und 7`, linking to the first paragraph in the sequence.
- **Smart Wrapping Detection:** Safely ignores laws already wrapped in HTML tags or wikilinks, allowing it to co-exist with other plugins.
- **Command Palette Integration:** Run the "Convert all Austrian law citations" command to batch-process older, unlinked notes.
- **Settings Toggle:** Easily enable or disable the live auto-typing feature without disabling the entire plugin.

## 📦 Installation (Manual Setup)

Because this is a custom plugin, it must be installed manually into your Obsidian vault.

### Prerequisites
- [Obsidian](https://obsidian.md/)

### Step-by-Step Guide
1. Create a new folder inside `plugins` named **exactly** `ris-linker`.
2. Copy `main.js` and `manifest.json` into the new `ris-linker` folder.
3. Restart Obsidian (or go to **Settings** > **Community Plugins** and click the refresh icon). 

## 🚀 Usage

Once the plugin is enabled, simply type your legal citations naturally. The plugin triggers automatically the moment you type a **Space** or hit **Enter** after a complete citation.

**Supported Patterns:**
- `ABGB § 1330` (or `StGB § 75`, `UStG 1988 § 12a`)
- `§ 1330 ABGB` 
- `ABGB §§ 6, 7`
- `ABGB § 6 und 7`
- `B-VG Art 7` (or `B-VG Art. 7`)

*(Note: The law abbreviation must match the exact `Titel` used by the RIS database).*

### Command Palette Action
If you have existing notes filled with raw citations that you want to link:
1. Open the file in Obsidian.
2. Open the Command Palette (`Ctrl/Cmd + P`).
3. Search for: **RIS Linker: Convert all Austrian law citations in current file to RIS links**.
4. Press Enter. All unlinked citations in the document will be converted instantly.

## 🛠️ How it Works (For Developers)

The plugin hooks into the Obsidian CodeMirror 6 Editor API using a `ViewPlugin`.
- **Live Typing Check:** It monitors `update.changes.iterChanges` to listen for `Space` or `\n` keystrokes.
- **Anchored Regex:** When triggered, it looks backward from the cursor to find matching citation patterns using anchored regular expressions, completely ignoring text that is already inside a markdown link.
- **CodeMirror Transaction:** If a match is found, it dispatches an editor transaction to physically delete the raw text and insert the formatted `[Law](URL)` string.

## 📝 License

This project is open-source and available under the MIT License. Feel free to fork, modify, and improve it to suit your specific legal research needs.
