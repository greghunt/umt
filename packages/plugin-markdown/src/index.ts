import type { Node } from "@umt/core";
import { createPlugin, map } from "@umt/core";
import type { Root } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { toMarkdown } from "mdast-util-to-markdown";

export const MARKDOWN_MIME_TYPE = "text/markdown";

function nodeToMdast(node: Node): Root {
	// biome-ignore lint/correctness/noUnusedVariables: Used for property removal.
	const { mimeType, ...mdastNode } = node;
	return mdastNode as Root;
}

const plugin = createPlugin(({ n }) => ({
	supports: [
		{
			mimeType: MARKDOWN_MIME_TYPE,
			parser: async (input: string) => {
				const mdast = fromMarkdown(input);
				const rootNode = await n(MARKDOWN_MIME_TYPE, mdast);
				return await map(rootNode, (node) => n(MARKDOWN_MIME_TYPE, node));
			},
			serializer: (node) => {
				const mdast = nodeToMdast(node);
				return toMarkdown(mdast);
			},
		},
	],
}));

export default plugin;
