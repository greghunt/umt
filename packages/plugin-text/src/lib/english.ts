import type { Node as MdNode, Root, Text } from "mdast";
import { toMarkdown } from "mdast-util-to-markdown";
import { toNlcst } from "mdast-util-to-nlcst";
import type { Node as NlNode, Root as NlRoot } from "nlcst";
import { toString } from "nlcst-to-string";
import retextEnglish from "retext-english";
import retextStringify from "retext-stringify";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { VFile } from "vfile";

// Extended text node that includes nlcst data
interface EnglishText extends Text {
	english?: NlNode;
}

async function parseText(input: string): Promise<NlRoot> {
	const nlcst = await unified()
		.use(retextEnglish)
		.use(retextStringify)
		.parse(input);

	return nlcst;
}

export function toEnglishMdast(root: Root): Root {
	visit(root, "text", (node: EnglishText) => {
		const file = new VFile({
			value: node.value,
			path: "text.md",
		});

		node.english = toNlcst(node, file, parser);
	});

	return root;
}
/**
 * Serialize mdast back to markdown, handling enhanced text nodes
 */
export function serialize(root: Root): string {
	// Clone the tree to avoid modifying the original
	const cleanedMdast = cleanTree(root);
	return toMarkdown(cleanedMdast);
}

function cleanTree(node: Root): Root {
	visit(node, "text", (node: EnglishText): MdNode => {
		// biome-ignore lint/correctness/noUnusedVariables: Used for property removal.
		const { english, ...rest } = node;
		return rest;
	});

	return node;
}
