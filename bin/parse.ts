#!/usr/bin/env tsx

import { inspect } from "node:util";
import umt, {
	createPlugin,
	isParentNode,
	type Node,
	type ParentNode,
} from "@umt/core";
import htmlPlugin from "@umt/plugin-html";
import idPlugin from "@umt/plugin-id";
import jsonPlugin from "@umt/plugin-json";
import markdownPlugin from "@umt/plugin-markdown";
import xmlPluginSerializer from "@umt/plugin-xml";

async function run() {
	let input = "";

	process.stdin.setEncoding("utf8");

	process.stdin.on("data", (chunk) => {
		input += chunk;
	});

	const fromMimeType = process.argv[2];
	const toMimeType = process.argv[3] ?? fromMimeType;
	process.stdin.on("end", () => main(input, fromMimeType, toMimeType));
}

interface ImageNode extends Node {
	src: string;
	width: number;
	height: number;
}

const plugin = createPlugin(({ n }) => ({
	events: {
		onCreate: [
			{
				mimeType: "text/markdown:image",
				event: (node): ParentNode => {
					const image = n<ImageNode>("image/jpeg", {
						type: "root",
						src: "https://example.com/image.jpeg",
						width: 100,
						height: 100,
					});

					const children = isParentNode(node)
						? [...node.children, image]
						: [image];

					return {
						...node,
						children,
					};
				},
			},
			{
				mimeType: "image/jpeg",
				event: (node) => {
					console.log("image/jpeg", node);
					return node;
				},
			},
		],
	},
}));

function main(input: string, mimeType: string, serializeMimeType: string) {
	const { parse, serialize } = umt({
		plugins: [
			markdownPlugin,
			idPlugin,
			htmlPlugin,
			jsonPlugin,
			xmlPluginSerializer,
			plugin,
		],
	});
	const node = parse(input, mimeType);
	console.log(inspect(node, { depth: null, colors: true }));
	console.log("\nBack to string:\n");
	console.log(serialize(node, serializeMimeType));
}

run();
