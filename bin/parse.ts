#!/usr/bin/env tsx

import { inspect } from "node:util";
import umt from "@umt/core";
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

	const mimeType = process.argv[2];
	const serializeMimeType = process.argv[3] ?? mimeType;
	process.stdin.on("end", () => main(input, mimeType, serializeMimeType));
}

function main(input: string, mimeType: string, serializeMimeType: string) {
	const { parse, serialize } = umt({
		plugins: [
			markdownPlugin,
			idPlugin,
			htmlPlugin,
			jsonPlugin,
			xmlPluginSerializer,
		],
	});
	const node = parse(input, mimeType);
	console.log(inspect(node, { depth: null, colors: true }));
	console.log("\nBack to string:\n");
	console.log(serialize(node, serializeMimeType));
}

run();
