import type { Node } from "@umt/core";
import { addChildren, createPlugin, createTypedEvent, map } from "@umt/core";
import type { Node as NlNode, Root } from "nlcst";
import { toString as nlToString } from "nlcst-to-string";
import retextEnglish from "retext-english";
import retextStringify from "retext-stringify";
import { unified } from "unified";

export const TEXT_MIME_TYPE = "text/plain";

export interface TextNode extends NlNode, Node {
	mimeType: typeof TEXT_MIME_TYPE;
}

declare module "@umt/core" {
	interface MimeTypeNodeMap {
		"text/markdown:text": MarkdownTextNode;
	}
}

export interface MarkdownTextNode extends Node {
	type: "text";
	value: string;
	mimeType: "text/markdown";
}

const plugin = createPlugin(({ n, parse }) => {
	return {
		supports: [
			{
				mimeType: TEXT_MIME_TYPE,
				parser: async (input: string) => {
					const nlcst = unified()
						.use(retextEnglish)
						.use(retextStringify)
						.parse(input);
					const rootNode = await n<Root>(nlcst, TEXT_MIME_TYPE);
					return await map(rootNode, (node) => n(node, TEXT_MIME_TYPE));
				},
				serializer: (node) => {
					return nlToString(node as unknown as Root);
				},
			},
		],
		events: {
			onCreate: [
				createTypedEvent<MarkdownTextNode>({
					mimeType: "text/markdown:text",
					event: async (node): Promise<Node> => {
						const rootTextNode = await parse(node.value, TEXT_MIME_TYPE);
						return addChildren(node, [rootTextNode]);
					},
				}),
			],
		},
	};
});

export default plugin;
