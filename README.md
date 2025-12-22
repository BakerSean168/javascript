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

```bash
npm install
```

## Usage

Each script can be run independently using Node.js:

```bash
node scripts/script-name.js
```

## License

MIT
