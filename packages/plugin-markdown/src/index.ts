import type { Node } from "@umt/core";
import { createPlugin, map } from "@umt/core";
import type { Node as MdastNode, Root } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { toMarkdown } from "mdast-util-to-markdown";

export const MARKDOWN_MIME_TYPE = "text/markdown";

export interface MarkdownNode extends MdastNode, Node {
	mimeType: typeof MARKDOWN_MIME_TYPE;
}

export const isMarkdownNode = (node: Node): node is MarkdownNode => {
	return node.mimeType === MARKDOWN_MIME_TYPE;
};

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
				const rootNode = await n<Root>(mdast, MARKDOWN_MIME_TYPE);
				return await map(rootNode, (node) => n(node, MARKDOWN_MIME_TYPE));
			},
			serializer: (node) => {
				const mdast = nodeToMdast(node);
				return toMarkdown(mdast);
			},
		},
	],
}));

export default plugin;
