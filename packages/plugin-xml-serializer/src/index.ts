import { createPlugin, type Node, type SerializerFunction } from "umt-core";

const XML_MIME_TYPE = "application/xml";

const xmlFormat = {
	indent: "\t",
};

function nodeToXml(
	node: Node,
	depth = 0,
	serialize: SerializerFunction,
): string {
	const indent = xmlFormat.indent.repeat(depth);
	const childIndent = xmlFormat.indent.repeat(depth + 1);

	const { type, mimeType } = node;
	const value = serialize(node);
	const attributes = { mimeType };

	const attrString = Object.entries(attributes)
		.filter(([, value]) => value !== undefined && value !== null)
		.map(([key, value]) => `${key}="${String(value).replace(/"/g, "&quot;")}"`)
		.join(" ");

	const elName = type;
	const openTag = `<${elName}${attrString ? ` ${attrString}` : ""}>`;
	const closeTag = `</${elName}>`;

	const cdataContent = value ? `<![CDATA[${value}]]>` : "";

	const children =
		"children" in node && Array.isArray(node.children) ? node.children : [];
	const childrenXml = children
		.map((child) => nodeToXml(child as Node, depth + 1, serialize))
		.join("\n");

	if (cdataContent || childrenXml) {
		const content = [
			cdataContent && `${childIndent}${cdataContent}`,
			childrenXml,
		]
			.filter(Boolean)
			.join("\n");

		return `${indent}${openTag}\n${content}\n${indent}${closeTag}`;
	}

	return `${indent}<${elName}${attrString ? ` ${attrString}` : ""} />`;
}

const plugin = createPlugin(({ serialize }) => ({
	serializers: [
		{
			from: "*/*",
			to: XML_MIME_TYPE,
			serializer: (node) => nodeToXml(node, 0, serialize),
		},
	],
}));

export default plugin;
