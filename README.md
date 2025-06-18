# Universal Mime Tree (UMT)

A universal parser system that converts various content types into a unified
tree structure with type safety and extensible plugins.

## Architecture

UMT is organized as a monorepo with the following structure:

```
umt/
├── packages/
│   ├── core/                    # Core UMT system
│   └── plugin-markdown/         # Markdown plugin
├── bin/                         # CLI tools
└── examples/                    # Usage examples
```

## Packages

### Core System (`@umt/core`)

The core UMT system provides:

- Base node interfaces and types
- Plugin registry system
- Parser infrastructure
- Type-safe node validation with Zod

### Plugins

Each plugin handles a specific MIME type:

- **`@umt/plugin-markdown`**: Handles `text/markdown` content
- More plugins coming soon: HTML, JSON, YAML, etc.

## Installation

```bash
# Install core system
pnpm add @umt/core

# Install plugins as needed
pnpm add @umt/plugin-markdown
```

## Usage

### Basic Usage

```typescript
import { parse } from "@umt/core";
import "@umt/plugin-markdown";

// Parse markdown content
const node = parse("# Hello World", "text/markdown");
console.log(node);
```

### Advanced Usage

```typescript
import { parse, createPlugin, pluginRegistry } from "@umt/core";

// Create a custom plugin
const myPlugin = createPlugin({
  mimeTypes: ["text/custom"],
  schemas: {
    text: {
      custom: {
        root: z.object({ value: z.string() }),
      },
    },
  },
  parsers: {
    text: {
      custom: {
        root: (input) => ({
          type: "root",
          mimeType: "text/custom",
          value: input,
        }),
      },
    },
  },
});

// Register the plugin
pluginRegistry.register(myPlugin);

// Use your custom parser
const node = parse("custom content", "text/custom");
```

## Development

### Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Development mode (watch for changes)
pnpm dev
```

### Path Aliases

For development, the project uses TypeScript path aliases for clean imports:

```typescript
// Instead of relative paths like:
import { parse } from "../packages/core/src/index";
import "../packages/plugin-markdown/src/index";

// You can use clean aliases:
import { parse } from "@umt/core";
import "@umt/plugin-markdown";
```

Available aliases:

- `@umt/core` - Core UMT system
- `@umt/plugin-markdown` - Markdown plugin
- `@umt/*` - Any plugin package

### Adding a New Plugin

1. Create a new package in `packages/plugin-{name}/`
2. Follow the structure in `packages/plugin-markdown/`
3. Add the package to the workspace configuration
4. Update the root `tsconfig.json` references

### CLI Usage

```bash
# Parse content from stdin
echo "# Hello World" | pnpm cli:parse
```

## Type Safety

UMT provides full TypeScript support with:

- Type-safe node definitions
- Plugin type extensions
- Compile-time validation
- IntelliSense support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

ISC
