import { createId } from "@paralleldrive/cuid2";
import { createPlugin, type Node } from "@umt/core";

interface NodeWithId extends Node {
	id: string;
}

export function hasId(node: Node): node is NodeWithId {
	return "id" in node && typeof node.id === "string";
}

const plugin = createPlugin({
	events: {
		onCreate: [
			{
				mimeType: "*/*",
				event: (node: Node): NodeWithId => {
					return { ...node, id: createId() };
				},
			},
		],
	},
});

export default plugin;
