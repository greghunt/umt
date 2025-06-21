import { fileTypeFromBuffer } from "file-type";
import type { Element } from "hast";
import { imageSize } from "image-size";
import type { Image as MdImage } from "mdast";
import type { Node } from "umt-core";
import { addChildren, createPlugin } from "umt-core";
import { hasId } from "umt-plugin-id";

interface ImgElement extends Element {
	tagName: "img";
}

type HtmlImageNode = Node & ImgElement;
type MdImageNode = Node & MdImage & { mimeType: "text/markdown" };

type NodeImageData = {
	src?: string;
	alt?: string;
	title?: string;
};

export type StoreFunction = (
	filename: string,
	buffer: Uint8Array,
) => Promise<string>;

export type PluginOptions = {
	store: StoreFunction;
};

export interface ImageNode extends Node {
	type: "blob";
	src: string;
	filename: string;
	path: string;
	width: number;
	height: number;
	title?: string;
	alt?: string;
	orientation?: number;
	// @todo: add exif data
	// exif?: Exif;
}

const isHtmlImage = (node: Node): node is HtmlImageNode => {
	return "tagName" in node && node.tagName === "img";
};

const isMdImage = (node: Node): node is MdImageNode => {
	return node.type === "image" && node.mimeType === "text/markdown";
};

function discreetType(mimeType: string): string {
	const [type] = mimeType.split("/");
	return type;
}

function isImageType(mimeType: string): boolean {
	return discreetType(mimeType) === "image";
}

function generateFilename(url: URL, detectedExt?: string): string {
	const pathname = url.pathname;
	let filename = pathname.split("/").pop() ?? url.toString();

	if (detectedExt && !filename.toLowerCase().endsWith(`.${detectedExt}`)) {
		const lastDotIndex = filename.lastIndexOf(".");
		if (lastDotIndex > 0) {
			filename = filename.substring(0, lastDotIndex);
		}
		filename = `${filename}.${detectedExt}`;
	}

	return filename;
}

export default function blobImagePlugin({ store }: PluginOptions) {
	return createPlugin(({ n }) => {
		const createImageHandler = async (node: Node, data: NodeImageData) => {
			if (!data.src) {
				return node;
			}

			const url = new URL(data.src);
			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`Unable to get image from ${data.src}`);
			}

			const buffer = Buffer.from(new Uint8Array(await response.arrayBuffer()));
			const fileType = await fileTypeFromBuffer(buffer);

			if (!fileType || !isImageType(fileType.mime)) {
				return node;
			}

			const mimeType = fileType.mime;
			const filename = hasId(node)
				? `${node.id}.${fileType.ext}`
				: generateFilename(url, fileType.ext);

			const path = await store(filename, buffer);
			const size = imageSize(buffer);

			const image = await n<ImageNode>({
				mimeType: mimeType ?? "image/*",
				filename,
				path,
				type: "blob",
				src: data.src,
				alt: data.alt,
				title: data.title,
				width: size.width,
				height: size.height,
				orientation: size.orientation,
			});

			return addChildren(node, [image]);
		};

		return {
			events: {
				onCreate: [
					{
						mimeType: "text/markdown",
						event: async (node) => {
							if (!isMdImage(node)) {
								return node;
							}

							const { url, alt, title } = node;
							return await createImageHandler(node, {
								src: url,
								alt: alt ?? undefined,
								title: title ?? undefined,
							});
						},
					},
					{
						mimeType: "text/html",
						event: async (node) => {
							if (!isHtmlImage(node)) {
								return node;
							}

							const { src, alt, title } = node.properties;
							return await createImageHandler(node, {
								src: src?.toString(),
								alt: alt?.toString(),
								title: title?.toString(),
							});
						},
					},
				],
			},
		};
	});
}
