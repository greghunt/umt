import mime from "mime";
import type { Node as UnistNode } from "unist";

type MimeType = string;

type PluginSupport = {
	mimeType: MimeType;
	parser: ParserFunction;
	serializer: SerializerFunction;
};

// biome-ignore lint/suspicious/noExplicitAny: Generic can be anything and will be defined by the plugin
type NodeEventContext = any;

type Serializer = {
	from: MimeType;
	to: MimeType;
	serializer: SerializerFunction;
};

type Umt = ReturnType<typeof umt>;

type Options = {
	plugins: (PluginDefinition | ((umt: Umt) => PluginDefinition))[];
};

export type CreateNodeEvent<TNode extends Node = Node> = {
	mimeType: MimeType;
	match?: (node: Node) => boolean;
	event: NodeEvent<TNode>;
	context?: NodeEventContext;
};

export function createTypedEvent<TNode extends Node>(
	event: CreateNodeEvent<TNode>,
): CreateNodeEvent<TNode> {
	return event;
}

export type SerializerFunction = (node: Node) => string | null;

export interface MaybeNode extends UnistNode {
	mimeType?: MimeType;
}

export interface Node extends MaybeNode {
	mimeType: MimeType;
	parent?: Node;
	index?: number;
}

export interface ParentNode extends Node {
	children: ChildNode[];
}

export interface ChildNode extends Node {
	parent: ParentNode;
	index: number;
}

export type ParserFunction = (input: string) => Node | Promise<Node>;

export type NodeEvent<TInputNode extends Node, Context = NodeEventContext> = (
	node: TInputNode,
	context?: Context,
) => Node | Promise<Node>;

// Type mapping interface for mime types to node types
export interface MimeTypeNodeMap {
	// Base types
	"*/*": Node;
	// Can be extended by plugins to register specific mime type -> node type mappings
}

export interface PluginDefinition {
	supports?: PluginSupport[];
	events?: {
		// biome-ignore lint/suspicious/noExplicitAny: Generic can be anything and will be defined by the plugin
		onCreate: CreateNodeEvent<any>[];
	};
	serializers?: Serializer[];
}

const nullSerializer: SerializerFunction = () => {
	return null;
};

function serKey(from: MimeType, to: MimeType) {
	return [from, to].join("|");
}

/**
 * Order matters for priority.
 */
function getAllTypesFromMime(mimeType: MimeType, nodeType: string): MimeType[] {
	const [parentMimeType] = mimeType.split("/");
	return ["*/*", `${parentMimeType}/*`, mimeType, `${mimeType}:${nodeType}`];
}

function setParentAndIndex(parent: ParentNode): void {
	for (let i = 0; i < parent.children.length; i++) {
		parent.children[i].parent = parent;
		parent.children[i].index = i;
	}
}

function filter(node: Node, fn: (node: Node) => boolean): Node {
	if (isParentNode(node)) {
		const filteredChildren = node.children
			.filter(fn)
			.map((child) => filter(child, fn));

		const newNode = {
			...node,
			children: filteredChildren,
		} as ParentNode;

		setParentAndIndex(newNode);

		return newNode;
	}

	return node;
}

export const detectMimeType = (input: string): MimeType | null => {
	// handles charsets, unlike getType directly.
	const ext = mime.getExtension(input);
	return mime.getType(ext ?? "");
};

export const createPlugin = (
	plugin: PluginDefinition | ((umt: Umt) => PluginDefinition),
) => {
	return plugin;
};

export const isParentNode = (node: Node): node is ParentNode => {
	return "children" in node;
};

export const addChildren = (node: Node, addChildren: Node[]): ParentNode => {
	const children = isParentNode(node)
		? [...node.children, ...addChildren]
		: addChildren;

	const newNode = {
		...node,
		children,
	} as ParentNode;

	// Set parent reference and index for all children
	setParentAndIndex(newNode);

	return newNode;
};

export const map = async <T extends Node = Node>(
	node: T,
	fn: (node: T) => Promise<T> | T,
	async = false,
): Promise<T> => {
	const mappedNode = await fn(node);

	if (isParentNode(mappedNode)) {
		if (async) {
			mappedNode.children = (await Promise.all(
				mappedNode.children.map((child) => map(child as unknown as T, fn)),
			)) as ChildNode[];
		} else {
			const children: Node[] = [];
			for (const child of mappedNode.children) {
				const mappedChild = await map(child as unknown as T, fn, async);
				children.push(mappedChild);
			}
			mappedNode.children = children as ChildNode[];
		}

		setParentAndIndex(mappedNode);
	}

	return mappedNode;
};

export const cleanNode = (node: Node): Node => {
	if (isParentNode(node)) {
		const { parent, index, children, ...cleanedNode } = node;
		return {
			...cleanedNode,
			children: children.map(cleanNode),
		} as ParentNode;
	}

	const { parent, index, ...cleanedNode } = node;
	return cleanedNode;
};

export default function umt(options: Options) {
	const { plugins } = options;
	const mimeTypes = new Set<MimeType>();
	const parsers = new Map<MimeType, ParserFunction>();
	const serializers = new Map<string, Serializer>();
	const createEvents = new Map<MimeType, CreateNodeEvent[]>();

	const umt = {
		serialize,
		parse,
		n,
		getMimeType,
	};

	registerPlugins(plugins);

	function registerPlugins(
		plugins: (PluginDefinition | ((umt: Umt) => PluginDefinition))[],
	) {
		for (const pluginOrFunction of plugins) {
			const plugin =
				typeof pluginOrFunction === "function"
					? pluginOrFunction(umt)
					: pluginOrFunction;

			if (plugin.supports) {
				for (const support of plugin.supports) {
					supportMimeType(support);
				}
			}

			if (plugin.events?.onCreate) {
				registerCreateEvents(plugin.events.onCreate);
			}

			if (plugin.serializers) {
				registerSerializers(plugin.serializers);
			}
		}
	}

	function supportMimeType(support: PluginSupport) {
		mimeTypes.add(support.mimeType);

		if (support.parser) {
			parsers.set(support.mimeType, support.parser);
		}

		registerSerializer({
			from: support.mimeType,
			to: support.mimeType,
			serializer: support.serializer ?? nullSerializer,
		});
	}

	function getMimeType(input: string): MimeType | null {
		const mimeType = detectMimeType(input);
		if (!mimeType) {
			return null;
		}

		return mimeTypes.has(mimeType) ? mimeType : null;
	}

	function registerSerializer(serializer: Serializer) {
		const key = serKey(serializer.from, serializer.to);
		serializers.set(key, serializer);
	}

	function registerSerializers(sers: Serializer[]) {
		for (const ser of sers) {
			registerSerializer(ser);
		}
	}

	function registerCreateEvents(events: CreateNodeEvent[]) {
		for (const event of events) {
			createEvents.set(event.mimeType, [
				...(createEvents.get(event.mimeType) ?? []),
				event,
			]);
		}
	}

	async function parse(input: string, mimeType: MimeType): Promise<Node> {
		if (!mimeTypes.has(mimeType)) {
			throw new Error(
				"No mime types have been registered. Please register plugins before parsing.",
			);
		}

		const parser = parsers.get(mimeType);
		if (!parser) {
			throw new Error(`No parser found for ${mimeType}`);
		}

		return await parser(input);
	}

	function getSerializer(
		fromMimeType: MimeType,
		toMimeType: MimeType,
	): SerializerFunction {
		const serializer = serializers.get(serKey(fromMimeType, toMimeType));

		if (serializer) {
			return serializer.serializer;
		}

		const baseType = fromMimeType.split("/")[0];
		if (baseType) {
			const baseSerializer = serializers.get(
				serKey(`${baseType}/*`, toMimeType),
			);
			if (baseSerializer) {
				return baseSerializer.serializer;
			}
		}

		const wildcardSerializer = serializers.get(serKey("*/*", toMimeType));
		if (wildcardSerializer) {
			return wildcardSerializer.serializer;
		}

		return nullSerializer;
	}

	function purifyNodeMimeType(node: Node): Node {
		return filter(node, (n) => node.mimeType === n.mimeType);
	}

	function serialize(node: Node, toMimeType?: MimeType): string | null {
		const fromMimeType = node.mimeType;
		const targetMimeType = toMimeType ?? fromMimeType;
		const serializer = getSerializer(fromMimeType, targetMimeType);
		// @todo: integrate transformers for mixed mime types. For now, we'll just purify to the target mime type.
		return serializer(purifyNodeMimeType(node));
	}

	async function n<T extends MaybeNode>(n: T, mime?: MimeType): Promise<Node> {
		const mimeType = n.mimeType ?? mime;
		if (!mimeType) {
			throw new Error("No mime type provided");
		}

		let node = { ...n, mimeType } as Node;
		const types = getAllTypesFromMime(node.mimeType, node.type);

		for (const type of types) {
			const events = createEvents.get(type);
			if (events) {
				for (const createEvent of events) {
					if (!createEvent.match || createEvent.match(node)) {
						const result = createEvent.event(node, createEvent.context);
						node = await result;
					}
				}
			}
		}

		return node;
	}

	return umt;
}
