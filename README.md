# Universal Mime Tree (UMT)

UMT is a universal parser for decomposing any data and maintaining its nested
structure. This package provides a core library with a plugin architecture meant
to be heavily extended.

It makes heavy use of [Unist](https://github.com/syntax-tree/unist) and its
ecosystem. In fact, tree nodes are extended Unist nodes. Any parsed data
produces a tree of mime-type dependent nodes. The mime-types dictate how we may
handle them.

There is also a recursive event system, so that nodes can be transformed or
further parsed into child nodes of other mime-types. It provides a way for a
simple plugin to recursively process data of varying formats.

## Why

- It provides an opportunity to decompose complex data, like binary data, into
  more informative parts
- It provides a way to post-process document parts, like a crawler that
  encounters link nodes, or an image data extractor.
- Interoperability is a breeze.
- Document content can have rich nesting of a variety of formats. For example,
  most markdown editors use remark (a Unist parser) to represent markdown as an
  AST. However, this can be extended to support embedded rich content as child
  nodes of the standard markdown nodes. This opens the door to a powerful and
  editor-friendly way to represent rich content.
- It's a semantically rich storage format, since data is decomposed and their
  relations are maintained.

## Architecture

### Core

The core library is pretty lean, but provides some powerful features meant to be
extended by plugins. The core itself consists of a `umt` object that maintains a
registry of **parsers**, **serializers**, and **events** for mime-types. Plugins
provided to the `umt` are responsible for registering these. In addition to
this, it provides a critical `n` function that creates a node that can be
post-processed by any other registered events of that node type.

The `umt` object is created with an array of plugins that dictate how nodes
should be handled.

Take a look at the sample parser in [bin/parse.ts](bin/parse.ts) for an example
of loading all the plugins in this repo. Instructions for running are
[here](bin/README.md).

### Plugins

- [@umt/plugin-blob-image](packages/plugin-blob-image) - Extracts and stores
  image data as a `blob` child node of any document images.
- [@umt/plugin-html](packages/plugin-html) - Adds support for HTML.
- [@umt/plugin-markdown](packages/plugin-markdown) - Adds support for Markdown.
- [@umt/plugin-xml](packages/plugin-xml) - Adds a serializer for XML.
- [@umt/plugin-id](packages/plugin-id) - Adds an id to nodes.
- [@umt/plugin-json](packages/plugin-json) - Adds support for JSON.
- [@umt/plugin-link-crawl](packages/plugin-link-crawl) - Crawls links in
  documents (markdown and HTML)

## License

ISC
