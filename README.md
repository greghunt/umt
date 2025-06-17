# Universal Mime Tree

UMT is a data structure aimed at unifying as many data formats as possible into
a cohesive tree.

The tree structure aims at maintaining the parent-child relationship between
many types of data. This lends itself well to decomposing complex data types,
like multimedia, into child nodes of other simpler formats.

For example, an MP4 video may have an SRT child, which itself is further
decomposed into a collection of SRT nodes that contain the timestamp and text.
This is one of many arbitrary examples but illustrates nicely the purpose of
this package.

This package is meant to have a small but generic footprint so that it can be
extended to any use case. It's responsible for creating the tree, emitting the
events, and applying the user provided configuration in the process.

The UMT is configured and then used with a parser:

```ts
import { parse } from "@unified-semantics/umt";

const md = "# Sample Markdown\nAllow me to be parsed, sir.";

const node = parse(md, "text/markdown");
```

This is a very simple example, because the complexity is hidden by some default
configuration. A configuration is actually implied here, and a parser for the
`text/markdown` MIME type is pre-configured. Here is explicitly:

```ts
import { parse, createConfig, n, generateId } from "@unified-semantics/umt"
import { fromMarkdown } from "mdast-util-from-markdown"
import { map } from 'unist-util-map'

const config = createConfig({
    supportedMimeTypes: ["text/markdown"],
    parsers: {
        "text/markdown": (str: string) {
            const mdast = fromMarkdown(str);
            return map(mdast, (node) => {
                return n("text/markdown", node, generateId);
            });
        }
    }
});

const md = "# Sample Markdown\nAllow me to be parsed, sir."

const node = parse(md, "text/markdown");
```
