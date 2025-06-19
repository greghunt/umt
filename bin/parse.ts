#!/usr/bin/env tsx

import { inspect } from "node:util";
import umt, {
	addChildren,
	createPlugin,
	type Node,
	type ParentNode,
} from "@umt/core";
import htmlPlugin from "@umt/plugin-html";
import idPlugin from "@umt/plugin-id";
import jsonPlugin from "@umt/plugin-json";
import linkCrawlPlugin from "@umt/plugin-link-crawl";
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
	mimeType: "image/jpeg";
	src: string;
	width: number;
	height: number;
}

const customPlugin = createPlugin(({ n }) => ({
	events: {
		onCreate: [
			{
				mimeType: "text/markdown:image",
				event: async (node): Promise<ParentNode> => {
					const image = await n<ImageNode>({
						mimeType: "image/jpeg",
						type: "root",
						src: "https://example.com/image.jpeg",
						width: 100,
						height: 100,
					});

					return addChildren(node, [image]);
				},
			},
		],
	},
}));

async function main(
	input: string,
	mimeType: string,
	serializeMimeType: string,
) {
	const { parse, serialize } = umt({
		plugins: [
			markdownPlugin,
			idPlugin,
			htmlPlugin,
			jsonPlugin,
			xmlPluginSerializer,
			linkCrawlPlugin({
				config: {
					allowedDomains: ["github.com", "greghunt.dev"],
				},
			}),
			customPlugin,
		],
	});
	const node = await parse(input, mimeType);
	console.log(inspect(node, { depth: 10, colors: true }));
	console.log("\nBack to string:\n");
	console.log(serialize(node, serializeMimeType));
}

run();
