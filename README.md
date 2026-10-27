# RIS Auto Linker

**RIS Auto Linker** is a Obsidian plugin designed specifically for Austrian law. It automatically detects Austrian legal citations (like `ABGB § 1330` or `B-VG Art 7`) in your notes and turns them into clickable links that direct you straight to the official [RIS (Rechtsinformationssystem des Bundes)](https://www.ris.bka.gv.at/) database.

It works seamlessly in both **Live Preview** (as you type) and **Reading Mode**, keeping your raw Markdown completely clean of messy URL syntax.

## ✨ Features

- **No Markdown Clutter:** Type `ABGB § 1330` and it becomes a link automatically
- **Supports Paragraphs & Articles:** Automatically routes `§` citations to the `VonParagraf` RIS parameter, and `Art` citations to the `VonArtikel` RIS parameter.

## 📦 Installation

Because this is a custom plugin (and not yet in the official Obsidian Community Plugins directory), you need to install it manually.

### Prerequisites
- [Obsidian](https://obsidian.md/)
- [Node.js](https://nodejs.org/) (for compiling the plugin)

### Step-by-Step Guide

1. Open your Obsidian Vault directory.
2. Navigate to `.obsidian/plugins/` (if the `plugins` folder doesn't exist, create it).
3. Create a new folder inside `plugins` named `ris-linker`.
4. Copy the following three files from your downloaded repository into the new `ris-linker` folder:
    - `main.js`
    - `manifest.json`
    - `package.json` (optional, but good practice)
5. Restart Obsidian (or go to **Settings** > **Community Plugins** and click the refresh icon). 
6. Toggle **RIS Auto Linker** to the "On" position in your Community Plugins list.

## 🚀 Usage

Once the plugin is enabled, simply type your legal citations naturally. The plugin uses Regex to find the following patterns:

**Paragraphs:**
- Type: `ABGB § 1330` (or `StGB § 75`, `UStG § 1`, etc.)
- Result: Links to the RIS database for that specific law and paragraph.

**Articles:**
- Type: `B-VG Art 7` (or `B-VG Art. 7`)
- Result: Links to the RIS database for that specific law and article.

*(Note: The law abbreviation must match the exact `Titel` used by the RIS database).*

## 🛠️ How it Works (For Developers)

The plugin hooks into two Obsidian APIs:
1. **CodeMirror 6 Extension:** Uses a `ViewPlugin` and a `RangeSetBuilder` to continuously scan the visible text in the Live Preview editor. When a Regex match is found, it applies an HTML `<a>` tag decoration to that specific text range.
2. **Markdown Post Processor:** When switching to Reading Mode, the plugin scans text nodes (ignoring existing code blocks and links), extracts the matches, and replaces them with standard HTML anchor elements pointing to the RIS query URLs.

## 📝 License

This project is open-source and available under the MIT License. Feel free to fork, modify, and improve it to suit your specific legal research needs.