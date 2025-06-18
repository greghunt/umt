import { createId } from "@paralleldrive/cuid2";
import { type Node, pluginRegistry } from "@umt/core";
import { MARKDOWN_MIME_TYPE } from "@umt/plugin-markdown";
import type { Node as MdNode } from "mdast";

type MarkdownNodeWithId = Node<MdNode> & { id: string };

declare module "@umt/core" {
	interface MimeTypeMap {
		"text/markdown": MarkdownNodeWithId;
	}
}

pluginRegistry.onCreate<MarkdownNodeWithId>(MARKDOWN_MIME_TYPE, (node) => {
	node.id = createId();
	return node;
});
