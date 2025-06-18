#!/usr/bin/env tsx

import { inspect } from "node:util";
import umt, { createPlugin, type Node } from "@umt/core";
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

interface HandledNode extends Node {
	handled: boolean;
}

const plugin = createPlugin({
	handlers: [
		{
			mimeType: "*/*",
			handlers: [
				(node): HandledNode => {
					return { ...node, handled: true };
				},
			],
		},
	],
});

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
