import type { Node } from "@umt/core";
import { addChildren, createPlugin } from "@umt/core";
import type { Element } from "hast";
import type { Link as MdLink } from "mdast";

interface AnchorElement extends Element {
	tagName: "a";
}

type HtmlLinkNode = Node & AnchorElement;
type MdLinkNode = Node & MdLink & { mimeType: "text/markdown" };

type CrawlContext = {
	startedAt: Date;
	currentDepth: number;
	processedUrls: Set<string>;
	currentDomain?: string;
};

type CrawlConfig = {
	currentDomainOnly: boolean;
	allowedDomains: string[];
	blockedDomains: string[];
	maxRedirects: number;
	timeout: number;
	maxContentSize: number;
	maxDepth: number;
	userAgent: string;
};

type PluginOptions = {
	config?: Partial<CrawlConfig>;
	context?: Partial<CrawlContext>;
};

const isHtmlLink = (node: Node): node is HtmlLinkNode => {
	return "tagName" in node && node.tagName === "a";
};

const isMdLink = (node: Node): node is MdLinkNode => {
	return node.type === "link" && node.mimeType === "text/markdown";
};

function isUrlAllowed(
	url: string,
	config: CrawlConfig,
	currentDomain?: string,
): boolean {
	let parsedUrl: URL;
	try {
		parsedUrl = new URL(url);
	} catch {
		return false;
	}

	const hostname = parsedUrl.hostname.toLowerCase();

	// Check blocked domains
	if (
		config.blockedDomains?.some((blocked: string) =>
			hostname.includes(blocked.toLowerCase()),
		)
	) {
		return false;
	}

	// Check current domain only restriction
	if (config.currentDomainOnly && currentDomain) {
		const currentHostname = new URL(currentDomain).hostname.toLowerCase();
		return hostname === currentHostname;
	}

	// Check allowed domains if specified
	if (config.allowedDomains && config.allowedDomains.length > 0) {
		return config.allowedDomains.some((allowed: string) =>
			hostname.includes(allowed.toLowerCase()),
		);
	}

	return true;
}

/**
 * Normalize a URL for consistent tracking
 * Removes fragments, sorts query parameters, and ensures consistent formatting
 */
export function normalizeUrl(url: string): string {
	try {
		const parsedUrl = new URL(url);

		// Remove fragment (hash)
		parsedUrl.hash = "";

		// Sort query parameters for consistent ordering
		const searchParams = new URLSearchParams(parsedUrl.search);
		searchParams.sort();
		parsedUrl.search = searchParams.toString();

		// Return the normalized URL
		return parsedUrl.toString();
	} catch {
		// If URL parsing fails, return the original URL
		return url;
	}
}

type FetchConfig = {
	timeout: number;
	userAgent: string;
	maxContentSize: number;
};

export async function fetchWithConfig(
	url: string,
	config: FetchConfig,
): Promise<Response> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), config.timeout);

	try {
		const response = await fetch(url, {
			signal: controller.signal,
			headers: {
				"User-Agent": config.userAgent,
			},
			redirect: "follow",
		});

		// Check content size if specified
		const contentLength = response.headers.get("content-length");
		if (
			contentLength &&
			Number.parseInt(contentLength) > config.maxContentSize
		) {
			throw new Error(
				`Content size ${contentLength} exceeds maximum ${config.maxContentSize}`,
			);
		}

		return response;
	} finally {
		clearTimeout(timeoutId);
	}
}

export default function linkCrawlPlugin(options: PluginOptions = {}) {
	const config = {
		currentDomainOnly: false,
		allowedDomains: [],
		blockedDomains: ["localhost", "127.0.0.1", "0.0.0.0"],
		maxRedirects: 3,
		timeout: 5000,
		userAgent: "UST Post Processor/1.0",
		maxContentSize: 1024 * 1024 * 5, // 5MB
		maxDepth: 1,
		...options.config,
	};
	const context = {
		startedAt: new Date(),
		currentDepth: 0,
		processedUrls: new Set<string>(),
		...options.context,
	};

	return createPlugin(({ parse, getMimeType }) => ({
		events: {
			onCreate: [
				{
					mimeType: "text/*",
					match: (node: Node) => {
						return isMdLink(node) || isHtmlLink(node);
					},
					context,
					event: async (node, ctx: CrawlContext) => {
						if (ctx.currentDepth > config.maxDepth) {
							return node;
						}

						const rawUrl = isHtmlLink(node)
							? node.properties.href?.toString()
							: isMdLink(node)
								? node.url
								: null;

						if (!rawUrl) {
							return node;
						}

						const url = normalizeUrl(rawUrl);

						if (
							ctx.processedUrls.has(url) ||
							!isUrlAllowed(url, config, ctx.currentDomain)
						) {
							return node;
						}

						try {
							const response = await fetchWithConfig(url, config);

							if (!response.ok) {
								console.warn(
									`Failed to fetch ${url}: ${response.status} ${response.statusText}`,
								);
								return node;
							}

							ctx.currentDepth++;
							ctx.processedUrls.add(url);
							const body = await response.text();
							const contentType = response.headers.get("content-type");
							const mimeType = getMimeType(contentType ?? "");
							if (mimeType) {
								const child = await parse(body, mimeType);
								return addChildren(node, [child]);
							}

							console.warn(
								`Unsupported mime type ${mimeType} (content type ${contentType}) for ${url}`,
							);
							return node;
						} catch (error) {
							console.warn(`Error fetching ${url}:`, error);
							return node;
						}
					},
				},
			],
		},
	}));
}
