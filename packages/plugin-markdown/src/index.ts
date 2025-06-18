import {
	type MimeType,
	type Node,
	n,
	type ParserFunction,
	pluginRegistry,
	type SerializerFunction,
} from "@umt/core";
import type { Root } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { toMarkdown } from "mdast-util-to-markdown";
import { map } from "unist-util-map";

export const MARKDOWN_MIME_TYPE: MimeType<"text/markdown"> =
	pluginRegistry.createMimeType("text/markdown" as const);

type MarkdownRootNode = Node<Root>;

const mdParser: ParserFunction = (input: string) => {
	const mdast = fromMarkdown(input);
	const rootNode = n(MARKDOWN_MIME_TYPE, mdast);
	return map(rootNode, (node) =>
		n(MARKDOWN_MIME_TYPE, node),
	) as MarkdownRootNode;
};

const mdSerializer: SerializerFunction = (node) => {
	return toMarkdown(node as MarkdownRootNode);
};

pluginRegistry.register({
	mimeType: MARKDOWN_MIME_TYPE,
	parser: mdParser,
	serializer: mdSerializer,
});
