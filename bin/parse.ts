#!/usr/bin/env tsx

import { inspect } from "node:util";
import { parse, serialize } from "@umt/core";
import { MARKDOWN_MIME_TYPE } from "@umt/plugin-markdown";
import "@umt/plugin-id";

async function run() {
	let input = "";

	process.stdin.setEncoding("utf8");

	process.stdin.on("data", (chunk) => {
		input += chunk;
	});

	process.stdin.on("end", () => {
		const node = parse(input, MARKDOWN_MIME_TYPE);
		console.log(inspect(node, { depth: null, colors: true }));
		console.log(serialize(node));
	});
}

run();
