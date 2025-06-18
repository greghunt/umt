import mime from "mime";
import type { Node as UnistNode } from "unist";

type MimeType = string;

type PluginSupport = {
	mimeType: MimeType;
	parser: ParserFunction;
	serializer: SerializerFunction;
};

type CreateNodeEvent = {
	mimeType: MimeType;
	event: NodeEvent<Node>;
};

export type SerializerFunction = (node: Node) => string | null;

type Serializer = {
	from: MimeType;
	to: MimeType;
	serializer: SerializerFunction;
};

export type HandlerFunction = (node: Node) => Node;
type Handler = {
	mimeType: MimeType;
	handlers: HandlerFunction[];
};

type Umt = ReturnType<typeof umt>;

type Options = {
	plugins: (PluginDefinition | ((umt: Umt) => PluginDefinition))[];
};

export interface Node extends UnistNode {
	mimeType: MimeType;
}

export type ParserFunction = (input: string) => Node;

export type NodeEvent<Node> = (node: Node) => Node;

export interface PluginDefinition {
	supports?: PluginSupport[];
	events?: {
		onCreate: CreateNodeEvent[];
	};
	serializers?: Serializer[];
	handlers?: Handler[];
}

const nullSerializer: SerializerFunction = () => {
	return null;
};

function serKey(from: MimeType, to: MimeType) {
	return [from, to].join("|");
}

function getAllTypesFromMime(extMimeType: MimeType): MimeType[] {
	const [mimeType, _nodeType] = extMimeType.split(":");
	const [parentMimeType, _subtype] = mimeType.split("/");
	return [extMimeType, mimeType, `${parentMimeType}/*`, "*/*"];
}

export const detectMimeType = (input: string): MimeType => {
	return mime.getType(input) ?? "text/plain";
};

export const createPlugin = (
	plugin: PluginDefinition | ((umt: Umt) => PluginDefinition),
) => {
	return plugin;
};

export default function umt(options: Options) {
	const { plugins } = options;
	const mimeTypes = new Set<MimeType>();
	const parsers = new Map<MimeType, ParserFunction>();
	const serializers = new Map<string, Serializer>();
	const handlers = new Map<MimeType, Handler>();
	const createEvents = new Map<MimeType, NodeEvent<Node>[]>();

	const umt = {
		serialize,
		parse,
		n,
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

			if (plugin.handlers) {
				registerHandlers(plugin.handlers);
			}
		}
	}

	function registerHandlers(handlers: Handler[]) {
		for (const handler of handlers) {
			registerHandler(handler);
		}
	}

	function registerHandler(handler: Handler) {
		handlers.set(handler.mimeType, handler);
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
				event.event,
			]);
		}
	}

	function parse(input: string, mimeType: MimeType): Node {
		if (!mimeTypes.has(mimeType)) {
			throw new Error(
				"No mime types have been registered. Please register plugins before parsing.",
			);
		}

		const parser = parsers.get(mimeType);
		if (!parser) {
			throw new Error(`No parser found for ${mimeType}`);
		}

		return parser(input);
	}

	function getSerializer(
		fromMimeType: MimeType,
		toMimeType: MimeType,
	): SerializerFunction | null {
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
		if (!wildcardSerializer) {
			throw new Error(
				`No serializer found for ${fromMimeType} => ${toMimeType}`,
			);
		}

		return wildcardSerializer.serializer;
	}

	function serialize(node: Node, toMimeType?: MimeType): string | null {
		const fromMimeType = node.mimeType;
		const targetMimeType = toMimeType ?? fromMimeType;
		const serializer = getSerializer(fromMimeType, targetMimeType);

		if (!serializer) {
			throw new Error(
				`No serializer found for ${fromMimeType} => ${targetMimeType}`,
			);
		}

		return serializer(node);
	}

	function n(mimeType: MimeType, n: UnistNode): Node {
		let node = { ...n, mimeType };
		const types = getAllTypesFromMime(mimeType);

		for (const type of types) {
			const events = createEvents.get(type);
			if (events) {
				for (const event of events) {
					node = event(node);
				}
			}

			const handler = handlers.get(type);
			if (handler) {
				for (const handlerFn of handler.handlers) {
					node = handlerFn(node);
				}
			}
		}

		return node;
	}

	return umt;
}
