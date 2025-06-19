import type { Node } from "@umt/core";
import { createPlugin } from "@umt/core";
import type { Element } from "hast";
import type { Link } from "mdast";

interface AnchorElement extends Element {
	tagName: "a";
}

type HtmlLink = Node & AnchorElement;
type MdLink = Node & Link & { mimeType: "text/markdown" };

type CrawlContext = {
	startedAt: Date;
	currentDepth: number;
	processedUrls: Set<string>;
};

const isHtmlLink = (node: Node): node is HtmlLink => {
	return "tagName" in node && node.tagName === "a";
};

const isMdLink = (node: Node): node is MdLink => {
	return node.type === "link" && node.mimeType === "text/markdown";
};

const context: CrawlContext = {
	startedAt: new Date(),
	currentDepth: 0,
	processedUrls: new Set<string>(),
};

const plugin = createPlugin(({ n }) => ({
	events: {
		onCreate: [
			{
				mimeType: "text/*",
				match: (node: Node) => {
					return isMdLink(node) || isHtmlLink(node);
				},
				context,
				event: (node, ctx: CrawlContext) => {
					ctx.currentDepth++;
					if (ctx) {
						console.log("ctx:", {
							startedAt: ctx.startedAt,
							currentDepth: ctx.currentDepth,
							processedUrlsCount: ctx.processedUrls.size,
						});
					}
					return node;
				},
			},
		],
	},
}));

export default plugin;
