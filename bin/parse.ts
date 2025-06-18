#!/usr/bin/env tsx

import { inspect } from "node:util";
import umt from "@umt/core";
import idPlugin from "@umt/plugin-id";
import markdownPlugin from "@umt/plugin-markdown";

async function run() {
	let input = "";

	process.stdin.setEncoding("utf8");

	process.stdin.on("data", (chunk) => {
		input += chunk;
	});

	process.stdin.on("end", () => main(input));
}

function main(input: string) {
	const { parse, serialize } = umt({
		plugins: [markdownPlugin, idPlugin],
	});
	const node = parse(input, "text/markdown");
	console.log(inspect(node, { depth: null, colors: true }));
	console.log("\nBack to string:\n");
	console.log(serialize(node));
}

run();
