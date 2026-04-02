export type EventType = string | symbol;

export type Handler<T = unknown> = (event: T) => void;
export type WildcardHandler<T = Record<string, unknown>> = (
	type: keyof T,
	event: T[keyof T]
) => void;

export type Unsubscribe = () => void;

export type EventHandlerList<T = unknown> = Array<Handler<T>>;
export type WildCardEventHandlerList<T = Record<string, unknown>> = Array<
	WildcardHandler<T>
>;

export type EventHandlerMap<Events extends Record<EventType, unknown>> = Map<
	keyof Events | '*',
	EventHandlerList<Events[keyof Events]> | WildCardEventHandlerList<Events>
>;

export interface Emitter<Events extends Record<EventType, unknown>> {
	all: EventHandlerMap<Events>;

	on<Key extends keyof Events>(type: Key, handler: Handler<Events[Key]>): Unsubscribe;
	on(type: '*', handler: WildcardHandler<Events>): Unsubscribe;

	off<Key extends keyof Events>(type: Key, handler?: Handler<Events[Key]>): void;
	off(type: '*', handler: WildcardHandler<Events>): void;

	emit<Key extends keyof Events>(type: Key, event: Events[Key]): void;
	emit<Key extends keyof Events>(type: undefined extends Events[Key] ? Key : never): void;
}

export default function zephyrEvents<Events extends Record<EventType, unknown>>(
	all?: EventHandlerMap<Events>
): Emitter<Events> {
	type GenericEventHandler = Handler<Events[keyof Events]> | WildcardHandler<Events>;

	all ??= new Map();

	return {
		all,

		on<Key extends keyof Events>(type: Key, handler: GenericEventHandler): Unsubscribe {
			let handlers = all!.get(type) as GenericEventHandler[] | undefined;
			if (!handlers) {
				handlers = [];
				all!.set(type, handlers as EventHandlerList<Events[keyof Events]>);
			}
			handlers.push(handler);

			return (): void => {
				const current = all!.get(type) as GenericEventHandler[] | undefined;
				if (current) {
					const idx = current.indexOf(handler);
					if (-1 < idx) {
						current.splice(idx, 1);
					}
					if (0 === current.length) {
						all!.delete(type);
					}
				}
			};
		},

		off<Key extends keyof Events>(type: Key, handler?: GenericEventHandler): void {
			const handlers = all!.get(type) as GenericEventHandler[] | undefined;
			if (!handlers) return;

			if (handler) {
				const idx = handlers.indexOf(handler);
				if (-1 < idx) {
					handlers.splice(idx, 1);
				}
				if (0 === handlers.length) {
					all!.delete(type);
				}
			} else {
				all!.delete(type);
			}
		},

		emit<Key extends keyof Events>(type: Key, evt?: Events[Key]): void {
			const handlers = all!.get(type) as Handler<Events[Key]>[] | undefined;
			if (handlers) {
				const snapshot = handlers.slice();
				const len = snapshot.length;
				for (let i = 0; i < len; i++) {
					snapshot[i](evt as Events[Key]);
				}
			}

			if ('*' !== type) {
				const wildcards = all!.get('*') as WildcardHandler<Events>[] | undefined;
				if (wildcards) {
					const snapshot = wildcards.slice();
					const len = snapshot.length;
					for (let i = 0; i < len; i++) {
						snapshot[i](type, evt as Events[keyof Events]);
					}
				}
			}
		}
	};
}
