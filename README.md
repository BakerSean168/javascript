# javascript-script

A collection of useful JavaScript scripts for processing network configurations and data transformations.

## Project Structure

- `scripts/` - Main script files
  - `clash_multi_protocol_generator.js` - Generate Clash YAML configurations for multiple protocols
  - `demo.js` - JSON to Markdown rendering demonstration
  - `generate_pdf.js` - PDF generation utilities
  - `port-detect.js` - Port detection functionality
  - `trojan_to_yaml.js` - Convert Trojan configurations to YAML
  - `vless_to_yaml.js` - Convert VLESS configurations to YAML
  - `vmess_to_yaml.js` - Convert VMess configurations to YAML

- `asserts/` - Template and configuration files
- `clash_yaml/` - Generated Clash YAML outputs

## Installation

Recommended: use pnpm for faster installs and workspace management.

```bash
pnpm -w install
```

## Usage

Each script can be run independently using Node.js:

```bash
node scripts/script-name.js
```

## Web Practice Workspace

I added a small `web/` folder with a starter HTML/CSS/JS exercise and VS Code config for live development.

- Start a quick static server: `npm run serve`
- Open `web/index.html` in the browser or use the Live Server extension

Files added:

- `web/index.html` — simple DOM + events example
- `web/styles.css` — example styles
- `web/script.js` — example DOM interaction

Recommended VS Code extensions are added to `.vscode/extensions.json`.

## React & Vue Practice

I added two small Vite-based practice apps under `web/`:

- `web/react` — minimal React + Vite template. Run:

```
cd web/react
pnpm install
pnpm run dev
```

- `web/vue` — minimal Vue 3 + Vite template. Run:

```
cd web/vue
pnpm install
pnpm run dev
```

These are lightweight starter projects you can edit and extend. I didn't automatically install dependencies — run `pnpm install` in the app folders when you're ready. To install all workspace packages from the repo root run `pnpm -w install`.

## License

MIT
