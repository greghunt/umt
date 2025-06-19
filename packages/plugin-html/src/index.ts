import type { Node } from "@umt/core";
import { createPlugin, map } from "@umt/core";
import type { Root } from "hast";
import { fromHtml } from "hast-util-from-html";
import { toHtml } from "hast-util-to-html";

export const HTML_MIME_TYPE = "text/html";

function nodeToHast(node: Node): Root {
	// biome-ignore lint/correctness/noUnusedVariables: Used for property removal.
	const { mimeType, ...hastNode } = node;
	return hastNode as Root;
}

const plugin = createPlugin(({ n }) => ({
	supports: [
		{
			mimeType: HTML_MIME_TYPE,
			parser: async (input: string) => {
				const hast = fromHtml(input);
				const rootNode = await n(HTML_MIME_TYPE, hast);
				return await map(rootNode, (node) => n(HTML_MIME_TYPE, node), false);
			},
			serializer: (node) => {
				const hast = nodeToHast(node);
				return toHtml(hast);
			},
		},
	],
}));

export default plugin;
