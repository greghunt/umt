import type { ChildNode, Node, ParentNode } from "@umt/core";
import { createPlugin, map } from "@umt/core";
import type { Heading, Node as MdastNode, Root } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { toMarkdown } from "mdast-util-to-markdown";

export const MARKDOWN_MIME_TYPE = "text/markdown";

export interface MarkdownNode extends MdastNode, Node {
	mimeType: typeof MARKDOWN_MIME_TYPE;
}

export const isMarkdownNode = (node: Node): node is MarkdownNode => {
	return node.mimeType === MARKDOWN_MIME_TYPE;
};

interface HeadingNode extends Heading, ChildNode {
	mimeType: typeof MARKDOWN_MIME_TYPE;
	type: "heading";
	parent: ParentNode;
}

function isHeading(node: Node): node is HeadingNode {
	return node.type === "heading";
}

function nodeToMdast(node: Node): Root {
	// biome-ignore lint/correctness/noUnusedVariables: Used for property removal.
	const { mimeType, parent, ...mdastNode } = node;
	return mdastNode as Root;
}

function getHeadingSectionNodes(node: HeadingNode): ParentNode {
	const sectionNodes: ChildNode[] = [node];

	for (const child of node.parent.children) {
		if (child.index > node.index) {
			if (isHeading(child) && child.depth <= node.depth) {
				break;
			}

			sectionNodes.push(child);
		}
	}

	return {
		mimeType: MARKDOWN_MIME_TYPE,
		type: "root",
		children: sectionNodes,
	};
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
				if (isHeading(node)) {
					const section = getHeadingSectionNodes(node);
					return toMarkdown(nodeToMdast(section));
				}

				return toMarkdown(nodeToMdast(node));
			},
		},
	],
}));

export default plugin;
