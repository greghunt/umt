import type { Node as UnistNode } from "unist";

declare const __mimeTypeBrand: unique symbol;
export type MimeType<T extends string = string> = T & {
	readonly [__mimeTypeBrand]: true;
};

export type Node<T extends UnistNode = UnistNode> = T & {
	mimeType: MimeType;
};

export type ParserFunction = (input: string) => Node;

export type SerializerFunction = (node: Node) => string | null;

export type NodeEvent<T extends Node = Node> = (node: T) => T;

export interface PluginDefinition {
	mimeType: MimeType;
	parser: ParserFunction;
	serializer?: SerializerFunction;
}

export interface MimeTypeMap {
	[key: string]: Node;
}

export type NodeForMimeType<M extends MimeType> = M extends MimeType<infer T>
	? T extends keyof MimeTypeMap
		? MimeTypeMap[T]
		: Node
	: Node;

const nullSerializer: SerializerFunction = () => {
	return null;
};

class PluginRegistry {
	private mimeTypes = new Set<MimeType>();
	private parsers = new Map<MimeType, ParserFunction>();
	private serializers = new Map<MimeType, SerializerFunction>();
	private onCreateEvents = new Map<MimeType, NodeEvent<Node>[]>();

	createMimeType<T extends string>(mimeType: T): MimeType<T> {
		const typedMimeType = mimeType as MimeType<T>;
		if (this.mimeTypes.has(typedMimeType)) {
			throw new Error(`Mime type ${mimeType} already registered`);
		}

		this.mimeTypes.add(typedMimeType);
		return typedMimeType;
	}

	register(plugin: PluginDefinition): void {
		if (!this.mimeTypes.has(plugin.mimeType)) {
			throw new Error(`Mime type ${plugin.mimeType} not registered`);
		}

		this.parsers.set(plugin.mimeType, plugin.parser);

		this.serializers.set(plugin.mimeType, plugin.serializer ?? nullSerializer);
	}

	onCreate<T extends Node>(mimeType: MimeType, event: NodeEvent<T>): void {
		const events = this.onCreateEvents.get(mimeType) ?? [];
		this.onCreateEvents.set(mimeType, [
			...events,
			event as unknown as NodeEvent<Node>,
		]);
	}

	getParser(mimeType: MimeType): ParserFunction | undefined {
		return this.parsers.get(mimeType);
	}

	hasType(mimeType: MimeType): boolean {
		return this.mimeTypes.has(mimeType);
	}

	getSerializer(mimeType: MimeType): SerializerFunction | undefined {
		return this.serializers.get(mimeType);
	}

	getOnCreateEvents(mimeType: MimeType): NodeEvent<Node>[] | undefined {
		return this.onCreateEvents.get(mimeType);
	}
}

export const pluginRegistry = new PluginRegistry();

export function n<T extends UnistNode>(mimeType: MimeType, n: T): Node<T> {
	let node = { ...n, mimeType };

	const events = pluginRegistry.getOnCreateEvents(mimeType);
	if (events) {
		for (const event of events) {
			node = event(node as Node) as Node<T>;
		}
	}

	return node;
}

export function parse(input: string, mimeType: MimeType): Node {
	if (!pluginRegistry.hasType(mimeType)) {
		throw new Error(
			"No mime types have been registered. Please register plugins before parsing.",
		);
	}

	const parser = pluginRegistry.getParser(mimeType);
	if (!parser) {
		throw new Error(`No parser found for ${mimeType}`);
	}

	return parser(input);
}

export function serialize(node: Node): string | null {
	if (!pluginRegistry.hasType(node.mimeType)) {
		throw new Error(
			"No mime types have been registered. Please register plugins before serializing.",
		);
	}

	const serializer = pluginRegistry.getSerializer(node.mimeType);
	if (!serializer) {
		throw new Error(`No serializer found for ${node.mimeType}`);
	}

	return serializer(node);
}
