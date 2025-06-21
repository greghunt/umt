import type { Node } from "umt-core";
import { createPlugin } from "umt-core";

const JSON_MIME_TYPE = "application/json";
type JsonMimeType = typeof JSON_MIME_TYPE;
type JsonDataType =
	| "array"
	| "object"
	| "string"
	| "number"
	| "boolean"
	| "null";

export interface JsonNode extends Node {
	type: JsonDataType;
	mimeType: JsonMimeType;
	value: string;
	key: string;
}

export interface JsonNodeParent extends JsonNode {
	children: JsonNode[];
}

function jsonNode(data: unknown, key = "root", type: JsonDataType): JsonNode {
	return {
		mimeType: JSON_MIME_TYPE,
		value: JSON.stringify(data),
		key,
		type,
	};
}

function jsonNodeParent(
	data: unknown,
	key = "root",
	type: JsonDataType,
	children: JsonNode[],
): JsonNodeParent {
	return {
		...jsonNode(data, key, type),
		children,
	};
}

function jsonDataType(data: unknown): JsonDataType {
	const type = data === null ? "null" : typeof data;
	if (type === "bigint") return "number";
	if (type === "symbol") return "string";
	return type as JsonDataType;
}

function fromJsonToNode(data: unknown, key = "root"): JsonNode {
	if (Array.isArray(data)) {
		const children = data.map((item, index) =>
			fromJsonToNode(item, index.toString()),
		);

		return jsonNodeParent(data, key, "array", children);
	}

	if (data !== null && typeof data === "object") {
		const children = Object.entries(data as Record<string, unknown>).map(
			([objKey, value]) => fromJsonToNode(value, objKey),
		);

		return jsonNodeParent(data, key, "object", children);
	}

	return jsonNode(data, key, jsonDataType(data));
}

function jsonNodeToValue(node: JsonNode): string {
	try {
		return JSON.parse(node.value);
	} catch {
		return node.value;
	}
}

const plugin = createPlugin({
	supports: [
		{
			mimeType: JSON_MIME_TYPE,
			parser: (input: string) => {
				const json = JSON.parse(input);
				return fromJsonToNode(json);
			},
			serializer: (node) => {
				return jsonNodeToValue(node as JsonNode);
			},
		},
	],
});

export default plugin;
