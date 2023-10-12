import { OBSEventTypes } from 'obs-websocket-js';
import { sockets } from '../plugin/sockets';
import { CanvasUtils, ImageUtils, SDUtils } from '../plugin/utils';
import { StateEnum } from './StateEnum';
import { globalSettings } from './globalSettings';
import { ConstructorParams, DidReceiveSettingsData, KeyDownData, KeyUpData, PartiallyRequired, PersistentSettings, SendToPluginData, WillAppearData, WillDisappearData } from './types';
import { EventEmitter as EvtEmitter } from 'eventemitter3';
import { SocketSettings } from './types';

interface ContextData<T> {
	targetObs: number,
	isInMultiAction: boolean,
	settings: (SocketSettings<T> | null)[],
	states: StateEnum[]
}

export abstract class AbstractBaseWsAction<T extends Record<string, unknown>> extends Action {
	_pressCache = new Map<string, NodeJS.Timeout>(); // <context, timeoutRef>
	_eventEmitter = new EvtEmitter();	// to-do: remove and use the internal eventEmitter emit/on functions?

	_contexts = new Map<string, ContextData<T>>();

	_titleParam: string | undefined;	// to-do: this type could be restricted more, something like keyof T?
	_statesColors = { on: '#517a96', intermediate: '#de902a', off: '#2b3e4b' };

	_hideTargetIndicators = false;

	_showSuccess = true;

	_defaultImg: HTMLImageElement | undefined;

	constructor(UUID: string, params?: Partial<ConstructorParams>) {
		super(UUID);
		this._titleParam = params?.titleParam;
		this._statesColors = { ...this._statesColors, ...params?.statesColors };
		this._hideTargetIndicators = !!params?.hideTargetIndicators;

		// Load default image
		this.getDefaultKeyImage().then(img => this._defaultImg = img).catch(() => console.warn(`Default img for ${this.UUID} couldn't be loaded`));

		// -- Main logic when key is pressed --
		this.onKeyDown((evtData: KeyDownData<{ advanced: { longPressMs?: string } }>) => {
			const { context, payload } = evtData;
			const { settings } = payload;

			if (this._pressCache.has(context)) return;

			const timeout = setTimeout(() => {
				this._pressCache.delete(context);
				this._eventEmitter.emit('longPress', evtData);
			}, Number(settings.advanced?.longPressMs) || Number(globalSettings.longPressMs) || 500);
			this._pressCache.set(context, timeout);

		});

		this.onKeyUp((evtData: KeyUpData<unknown>) => {
			const { context } = evtData;
			// Check if long press
			if (!this._pressCache.has(context)) { // it was long press, already processed
				return;
			}
			else {
				clearTimeout(this._pressCache.get(context));
				this._pressCache.delete(context);
				this._eventEmitter.emit('singlePress', evtData);
			}

		});
		// --

		// -- Contexts cache --
		this.onWillAppear(async (evtData: WillAppearData<any>) => {
			const { context, payload } = evtData;
			const { settings, isInMultiAction } = payload;
			const contextData: ContextData<T> = {
				targetObs: this.getTarget(settings),
				isInMultiAction: !!isInMultiAction,
				settings: this.getSettingsArray(settings),
				states: await this.fetchStates(settings),
			};
			this._contexts.set(context, contextData);
			this.updateTitle(context, this._titleParam);
			this.updateKeyImage(context);
		});

		this.onWillDisappear((evtData: WillDisappearData<any>) => {
			const { context } = evtData;
			this._contexts.delete(context);
		});

		this.onDidReceiveSettings(async (evtData: DidReceiveSettingsData<any>) => {
			const { context, payload } = evtData;
			const { settings, isInMultiAction } = payload;
			const contextData: ContextData<T> = {
				targetObs: this.getTarget(settings),
				isInMultiAction: !!isInMultiAction,
				settings: this.getSettingsArray(settings),
				states: await this.fetchStates(settings),
			};
			this._contexts.set(context, contextData);
			this.updateTitle(context, this._titleParam);
			this.updateKeyImage(context);
		});
		// --

		// -- Sockets connected/disconnected
		sockets.forEach((socket, socketIdx) => {
			socket.on('Identified', async () => {
				if (this.onSocketConnected) await this.onSocketConnected(socketIdx);
				for (const [context, { settings }] of this._contexts) {
					const newState = await this.fetchSocketState(settings[socketIdx], socketIdx).catch(() => StateEnum.Unavailable);
					this._updateSocketState(context, socketIdx, newState);
				}
				this.updateImages();
			});

			// @ts-expect-error Disconnected event is custom of the Socket class, not part of the OBS WS protocol
			socket.on('Disconnected', async () => {
				if (this.onSocketDisconnected) await this.onSocketDisconnected(socketIdx);
				for (const [context] of this._contexts) {
					this._updateSocketState(context, socketIdx, StateEnum.Unavailable);
				}
				this.updateImages();
			});
		});
		// --

		// Update images on global settings updated
		$SD.onDidReceiveGlobalSettings(() => {
			this.updateImages();
		});

		// When PI is loaded and ready, extra optional logic per action
		this.onSendToPlugin(async ({ context, action, payload }: SendToPluginData<{ event: string }>) => {
			if (payload.event === 'ready' && this.onPropertyInspectorReady) {
				await this.onPropertyInspectorReady({ context, action })
				.catch(() => SDUtils.logError('Error executing custom onPropertyInspectorReady()'));
			}
		});

		// Attach status event listener if defined
		const statusEvent = params?.statusEvent;
		if (statusEvent) {
			this.attachEventListener(statusEvent as keyof OBSEventTypes);
		}

	}

	onSinglePress = (callback: (evtData: KeyUpData<any>) => void) => this._eventEmitter.on('singlePress', callback);
	onLongPress = (callback: (evtData: KeyDownData<any>) => void) => this._eventEmitter.on('longPress', callback);

	// -- Optional methods called on socket connected/disconnected
	async onSocketConnected?(socketIdx: number): Promise<void>
	async onSocketDisconnected?(socketIdx: number): Promise<void>

	// -- General helpers --
	getCommonSettings(settings: PersistentSettings<T>) {
		settings = settings ?? {};
		return {
			target: parseInt(settings.common?.target || globalSettings.defaultTarget || '0'),
			indivParams: !!settings.common?.indivParams,
		};
	}

	getTarget(settings: PersistentSettings<T>): number {
		return this.getCommonSettings(settings).target;
	}

	getSettingsArray(settings: PersistentSettings<T>): (SocketSettings<T> | null)[] {
		settings = settings ?? {};
		const { target, indivParams } = this.getCommonSettings(settings);
		const settingsArray = [];
		for (let i = 0; i < sockets.length; i++) {
			if (target === 0 || target === i + 1) {
				settingsArray.push(settings[`params${(target === 0 && !indivParams) ? 1 : i + 1}`] ?? {});
			}
			else {
				settingsArray.push(null);
			}
		}
		return settingsArray;
	}

	/**
	 * Update key title with the corresponding settings param string, depending on configured target
	 */
	updateTitle(context: string, settingsParam: string | undefined) {
		if (!settingsParam) return;
		const contextData = this._contexts.get(context);
		if (!contextData || contextData.isInMultiAction) return;	// to-do: also check if a title associated param is defined for this class object

		const titles = contextData.settings
		.filter(socketSettings => socketSettings)
		.map(socketSettings => socketSettings![settingsParam] as string || '?');

		const title = [...new Set(titles)].join('\n');
		SDUtils.setKeyTitle(context, title);
	}
	// --

	/**
	 * Triggers when PI has imported everything and is ready to be shown to the user
	 */
	async onPropertyInspectorReady?({ context, action }: { context: string, action: string }): Promise<void>

	// --
	_getContextSettings(context: string) {
		return this._contexts.get(context)?.settings;
	}

	_setContextSettings(context: string, settings: (SocketSettings<T> | null)[]) {
		if (!this._contexts.has(context)) return;
		this._contexts.get(context)!.settings = settings;
	}

	_getContextStates(context: string) {
		return this._contexts.get(context)?.states;
	}

	_setContextStates(context: string, states: StateEnum[]) {
		const contextData = this._contexts.get(context);
		if (!contextData) return;

		// Update cache
		contextData.states = states;

		// Update SD state - active (0) only if all target states are active
		const { targetObs } = contextData;
		const sdState = states.filter((_, i) => targetObs === 0 || targetObs - 1 === i).every(state => state === StateEnum.Active) ? 0 : 1;
		$SD.setState(context, sdState);
	}
	// --

	// -- States --
	/**
	 * Fetch the current states associated with an action, for all OBS instances.
	 * Never rejects
	 * @param settings Action persistent settings
	 * @returns
	 */
	async fetchStates(settings: PersistentSettings<T>): Promise<StateEnum[]> {
		const settingsArray = this.getSettingsArray(settings);
		const statesResults = await Promise.allSettled(settingsArray.map((socketSettings, idx) => {
			return this.fetchSocketState(socketSettings, idx);
		}));
		return statesResults.map(res => res.status === 'fulfilled' ? res.value : StateEnum.Unavailable);
	}

	/**
	 * Utility wrapper around fetchState. Don't override
	 * to-do: make it private, private methods can't be overriden by children
	 */
	async fetchSocketState(socketSettings: unknown, socketIdx: number): Promise<StateEnum> {
		if (!socketSettings || !sockets[socketIdx].isConnected) return StateEnum.Unavailable;
		return this.fetchState ? this.fetchState(socketSettings, socketIdx) : StateEnum.None;
	}

	/**
	 * Update a particular socket state to the provided value
	 * @param context Action context
	 * @param socketIdx Socket index to update
	 * @param state New state for the socket
	 */
	// to-do: check if this function is really needed or I can directly modify the contexts map
	_updateSocketState(context: string, socketIdx: number, state: StateEnum) {
		const { states } = this._contexts.get(context) ?? {};
		if (!states) return;
		states[socketIdx] = state;
		this._setContextStates(context, states);
	}
	// --

	// -- Images update --
	/**
	 * Get default action key image, defined in the manifest.json, as an HTML element
	 */
	getDefaultKeyImage(): Promise<HTMLImageElement> {
		const actionName = this.UUID.split('.').at(-1);
		const imgUrl = `../assets/actions/${actionName}/key.svg`;
		return ImageUtils.loadImagePromise(imgUrl);
	}

	async getForegroundImage?(context: string): Promise<HTMLImageElement | HTMLCanvasElement | undefined>;

	async generateKeyImage(context: string) {
		if (!this._contexts.has(context)) return;
		const { states, targetObs } = this._contexts.get(context)!;

		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.globalCompositeOperation = 'source-over';

		canvas.width = 144;
		canvas.height = 144;

		// Draw image to canvas
		const foregroundImg = this.getForegroundImage ? await this.getForegroundImage(context) : this._defaultImg;
		if (foregroundImg) {
			ctx.drawImage(foregroundImg, 0, 0);
		}

		// Draw target numbers
		if (!this._hideTargetIndicators && globalSettings.targetNumbers !== 'hide') {
			ctx.globalCompositeOperation = 'source-over';
			ctx.fillStyle = '#efefef';
			ctx.font = 'bold 25px Arial';
			const pos = globalSettings.targetNumbers ?? 'top';
			ctx.textBaseline = pos;
			const yPos = pos === 'top' ? 10 : pos === 'middle' ? canvas.height / 2 : canvas.height - 10;
			if (targetObs === 0 || targetObs === 1) {
				ctx.textAlign = 'left';
				ctx.fillText('1', 0 + 10, yPos);
			}
			if (targetObs === 0 || targetObs === 2) {
				ctx.textAlign = 'right';
				ctx.fillText('2', canvas.width - 10, yPos);
			}
		}

		// Draw target state
		if (states) {
			if (targetObs !== 0) {
				if (states[targetObs - 1] === StateEnum.Unavailable) {
					CanvasUtils.drawLineVPatternRect(ctx, 0, 1);
				}
				else {
					if (states[targetObs - 1] === StateEnum.Inactive) {
						CanvasUtils.drawColorRect(ctx, '#a0a0a0', 0, 1, 'source-atop');
					}
					CanvasUtils.drawColorRect(ctx, states[targetObs - 1] === StateEnum.Inactive ? this._statesColors.off : states[targetObs - 1] === StateEnum.Intermediate ? this._statesColors.intermediate : this._statesColors.on, 0, 1, 'destination-over');
				}
			}
			else {
				for (let i = 0; i < states.length; i++) {
					if (states[i] === StateEnum.Unavailable) {
						CanvasUtils.drawLineVPatternRect(ctx, i / 2, (i + 1) / 2);
					}
					else {
						if (states[i] === StateEnum.Inactive) {
							CanvasUtils.drawColorRect(ctx, '#a0a0a0', i / 2, (i + 1) / 2, 'source-atop');
						}
						CanvasUtils.drawColorRect(ctx, states[i] === StateEnum.Inactive ? this._statesColors.off : states[i] === StateEnum.Intermediate ? this._statesColors.intermediate : this._statesColors.on, i / 2, (i + 1) / 2, 'destination-over');
					}
				}
			}
		}

		return canvas.toDataURL('image/png', 1);
	}

	async updateKeyImage(context: string) {
		const b64 = await this.generateKeyImage(context);
		$SD.setImage(context, b64);
	}

	/**
	 * Update key images for all action contexts in cache.
	 */
	async updateImages(): Promise<void> {
		try {
			const images = new Map<string, string>();
			for (const [context] of this._contexts) {
				const image = await this.generateKeyImage(context);
				if (image) images.set(context, image);
			}
			for (const [context, image] of images) {
				$SD.setImage(context, image);
			}
		}
		catch (e) {
			console.error(`Error updating key images: ${e}`);
		}
	}
	// --

	// -- Optional functions for stateful actions
	_dirtyContexts = new Set<string>();
	attachEventListener(statusEvent: keyof OBSEventTypes) {
		if (!this.shouldUpdateState || !this.getStateFromEvent) return;
		sockets.forEach((socket, evtSocketIdx) => {
			socket.on(statusEvent, async (...args) => {
				for (const [context, { settings, states }] of this._contexts) {
					try {
						const [evtData] = args;
						const socketSettings = settings[evtSocketIdx];
						if (socketSettings && await this.shouldUpdateState!(evtData, socketSettings, evtSocketIdx)) {
							const newState = this.getStateFromEvent!(evtData, socketSettings);
							if (newState !== states[evtSocketIdx]) {
								states[evtSocketIdx] = newState;
								this._setContextStates(context, states);
								this._dirtyContexts.add(context);
							}
						}
					}
					catch (e) {
						console.error(`Error getting state from event: ${e}`);
					}
				}

				// Small delay to batch image updates with ptential events from other sockets
				setTimeout(async () => {
					const images = new Map<string, string>();
					for (const context of this._dirtyContexts) {
						const image = await this.generateKeyImage(context);
						if (image) images.set(context, image);
						this._dirtyContexts.delete(context);
					}
					for (const [context, image] of images) {
						$SD.setImage(context, image);
					}
				}, 50);
			});
		});
	}

	/**
	 * Fetch the current OBS state associated with the action (e.g. if scene is visible).
	 * Rejects on fetching error.
	 * @param socketSettings Action settings for the target OBS
	 * @param socketIdx Index of the OBS instance to fetch settings from
	 * @returns None/Active/Inactive
	 */
	async fetchState?(socketSettings: SocketSettings<T>, socketIdx: number): Promise<Exclude<StateEnum, StateEnum.Unavailable | StateEnum.None>>;

	/**
	 * Whether a received event should trigger an state update an action
	 * @param evtData Event data
	 * @param socketSettings Action settings for the corresponding socket
	 * @param socketIdx Socket index
	 */
	async shouldUpdateState?(evtData: unknown, socketSettings: SocketSettings<T>, socketIdx: number): Promise<boolean>;

	/**
	 * Get state associated with the action from the event that notifies a state update
	 * @param evtData Event data
	 * @param socketSettings Action settings for the corresponding socket
	 * @returns New state
	 */
	getStateFromEvent?(evtData: unknown, socketSettings: SocketSettings<T>): StateEnum;
	// --
}


export { AbstractBaseWsAction as AbstractStatelessAction };

export abstract class AbstractStatefulAction<T extends Record<string, unknown>, U extends keyof OBSEventTypes> extends AbstractBaseWsAction<T> {

	constructor(UUID: string, params: PartiallyRequired<ConstructorParams, 'statusEvent'>) {
		super(UUID, params);
		this._showSuccess = false;	// success already shown via event updates
	}

	abstract override fetchState(socketSettings: SocketSettings<T>, socketIdx: number): Promise<Exclude<StateEnum, StateEnum.Unavailable | StateEnum.None>>;
	abstract override shouldUpdateState(evtData: OBSEventTypes[U], socketSettings: SocketSettings<T>, socketIdx: number): Promise<boolean>;
	abstract override getStateFromEvent(evtData: OBSEventTypes[U], socketSettings: SocketSettings<T>): StateEnum;
}