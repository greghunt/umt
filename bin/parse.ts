#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";
// UMT & Plugins
import umt from "@umt/core";
import blobImagePlugin, { type StoreFunction } from "@umt/plugin-blob-image";
import htmlPlugin from "@umt/plugin-html";
import idPlugin from "@umt/plugin-id";
import jsonPlugin from "@umt/plugin-json";
import linkCrawlPlugin from "@umt/plugin-link-crawl";
import markdownPlugin from "@umt/plugin-markdown";
import textPlugin from "@umt/plugin-text";
import xmlPluginSerializer from "@umt/plugin-xml";
import { inspect } from "unist-util-inspect";

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

const store: StoreFunction = async (filename, buffer) => {
	const storageDir = ".storage";
	if (!fs.existsSync(storageDir)) {
		fs.mkdirSync(storageDir, { recursive: true });
	}

	const filePath = path.join(storageDir, filename);
	fs.writeFileSync(filePath, buffer);
	return filePath;
};

async function main(
	input: string,
	mimeType: string,
	serializeMimeType: string,
) {
	const { parse, serialize } = umt({
		plugins: [
			idPlugin,
			// textPlugin,
			markdownPlugin,
			htmlPlugin,
			jsonPlugin,
			xmlPluginSerializer,
			linkCrawlPlugin({
				config: {
					allowedDomains: ["github.com", "greghunt.dev"],
				},
			}),
			blobImagePlugin({ store }),
		],
	});
	const node = await parse(input, mimeType);

	console.log(inspect(node));
	console.log("\nBack to string:\n");
	console.log(serialize(node, serializeMimeType));
}

run();
