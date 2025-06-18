import type { Node as UnistNode } from "unist";

type MimeType = string;

export interface Node extends UnistNode {
	mimeType: MimeType;
}

export type ParserFunction = (input: string) => Node;

export type SerializerFunction = (node: Node) => string | null;

export type NodeEvent<Node> = (node: Node) => Node;

type PluginSupport = {
	mimeType: MimeType;
	parser: ParserFunction;
	serializer: SerializerFunction;
};

type CreateNodeEvent = {
	mimeType: MimeType;
	event: NodeEvent<Node>;
};

export interface PluginDefinition {
	supports?: PluginSupport[];
	events?: {
		onCreate: CreateNodeEvent[];
	};
}

const nullSerializer: SerializerFunction = () => {
	return null;
};

type Umt = ReturnType<typeof umt>;

export const createPlugin = (
	plugin: PluginDefinition | ((umt: Umt) => PluginDefinition),
) => {
	return plugin;
};

type Options = {
	plugins: (PluginDefinition | ((umt: Umt) => PluginDefinition))[];
};

export default function umt(options: Options) {
	const { plugins } = options;
	const mimeTypes = new Set<MimeType>();
	const parsers = new Map<MimeType, ParserFunction>();
	const serializers = new Map<MimeType, SerializerFunction>();
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
		}
	}

	function supportMimeType(support: PluginSupport) {
		mimeTypes.add(support.mimeType);

		if (support.parser) {
			parsers.set(support.mimeType, support.parser);
		}

		serializers.set(support.mimeType, support.serializer ?? nullSerializer);
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

	function serialize(node: Node): string | null {
		if (!mimeTypes.has(node.mimeType)) {
			throw new Error(
				"No mime types have been registered. Please register plugins before serializing.",
			);
		}

		const serializer = serializers.get(node.mimeType);

		if (!serializer) {
			throw new Error(`No serializer found for ${node.mimeType}`);
		}

		return serializer(node);
	}

	function n(mimeType: MimeType, n: UnistNode): Node {
		let node = { ...n, mimeType };

		const events = createEvents.get(mimeType);
		if (events) {
			for (const event of events) {
				node = event(node);
			}
		}

		return node;
	}

	return umt;
}
