import { OBSEventTypes } from 'obs-websocket-js';
import { sockets } from '../plugin/sockets';
import { SDUtils, SVGUtils } from '../plugin/utils';
import { StateEnum } from './StateEnum';
import { globalSettings } from './globalSettings';
import { ContextData, SocketSettings, ConstructorParams, DidReceiveSettingsData, KeyDownData, KeyUpData, PartiallyRequired, PersistentSettings, SendToPluginData, WillAppearData, WillDisappearData } from './types';

/** Base class for all actions used to communicate with OBS WS */
export abstract class AbstractBaseWsAction<T extends Record<string, unknown>> extends Action {
	private _contexts = new Map<string, ContextData<T>>(); // <context, contextData>

	private _titleParam: string | undefined;	// to-do: this type could be restricted more, something like keyof T?
	private _statesColors = { on: '#517a96', intermediate: '#de902a', off: '#43667d' };
	private _hideTargetIndicators = false;
	protected _showSuccess = true;

	private _pressCache = new Map<string, NodeJS.Timeout>(); // <context, timeoutRef>
	private _defaultKeyImg: string | undefined;
	static _dirtyImages = new Map<string, string>(); // <context, b64 image>

	constructor(UUID: string, params?: Partial<ConstructorParams>) {
		super(UUID);
		this._titleParam = params?.titleParam;
		this._statesColors = { ...this._statesColors, ...params?.statesColors };
		this._hideTargetIndicators = !!params?.hideTargetIndicators;

		// Load default image
		this._getDefaultKeyImage().then(img => this._defaultKeyImg = img).catch(() => console.warn(`Default key image for ${this.UUID} couldn't be loaded`));

		// -- Main logic when key is pressed --
		this.onKeyDown((evtData: KeyDownData<{ advanced: { longPressMs?: string } }>) => {
			const { context, payload } = evtData;
			const { settings } = payload;

			if (this._pressCache.has(context)) return;

			const timeout = setTimeout(() => {
				this._pressCache.delete(context);
				this.emit(`${this.UUID}.longPress`, evtData);
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
				this.emit(`${this.UUID}.singlePress`, evtData);
			}
		});
		// --

		// -- Contexts cache --
		this.onWillAppear(async (evtData: WillAppearData<any>) => {
			const { context, payload } = evtData;
			const { settings, isInMultiAction } = payload;
			const settingsArray = this.getSettingsArray(settings);
			const contextData: ContextData<T> = {
				targetObs: this.getTarget(settings),
				isInMultiAction: !!isInMultiAction,
				settings: settingsArray,
				states: await this._fetchStates(settingsArray),
			};
			this._contexts.set(context, contextData);
			if (this.onContextAppear) await this.onContextAppear(context, contextData);

			this._updateTitle(context, this._titleParam);
			this.updateKeyImage(context);
			this._updateSDState(context, contextData);
		});

		this.onWillDisappear((evtData: WillDisappearData<any>) => {
			const { context } = evtData;
			this._contexts.delete(context);
			if (this.onContextDisappear) this.onContextDisappear(context);
		});

		this.onDidReceiveSettings(async (evtData: DidReceiveSettingsData<any>) => {
			const { context, payload } = evtData;
			const { settings, isInMultiAction } = payload;
			const settingsArray = this.getSettingsArray(settings);
			const contextData: ContextData<T> = {
				targetObs: this.getTarget(settings),
				isInMultiAction: !!isInMultiAction,
				settings: settingsArray,
				states: await this._fetchStates(settingsArray),
			};
			this._contexts.set(context, contextData);
			if (this.onContextSettingsUpdated) await this.onContextSettingsUpdated(context, contextData);

			this._updateTitle(context, this._titleParam);
			this.updateKeyImage(context);
			this._updateSDState(context, contextData);
		});
		// --

		// -- Sockets connected/disconnected
		sockets.forEach((socket, socketIdx) => {
			socket.on('Identified', async () => {
				if (this.onSocketConnected) await this.onSocketConnected(socketIdx);
				for (const [context, { settings, states }] of this._contexts) {
					const newState = await this._fetchSocketState(settings[socketIdx], socketIdx).catch(() => StateEnum.Unavailable);
					if (newState !== states[socketIdx]) {
						this.setContextSocketState(context, socketIdx, newState);
						this.updateKeyImage(context);
					}
				}
			});

			// @ts-expect-error Disconnected event is custom of the Socket class, not part of the OBS WS protocol
			socket.on('Disconnected', async () => {
				if (this.onSocketDisconnected) await this.onSocketDisconnected(socketIdx);
				for (const [context, { states }] of this._contexts) {
					if (states[socketIdx] !== StateEnum.Unavailable) {
						this.setContextSocketState(context, socketIdx, StateEnum.Unavailable);
						this.updateKeyImage(context);
					}
				}
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
			this._attachEventListener(statusEvent as keyof OBSEventTypes);
		}

	}

	// -- Key press methods
	protected onSinglePress = (callback: (evtData: KeyUpData<any>) => void) => this.on(`${this.UUID}.singlePress`, callback);
	protected onLongPress = (callback: (evtData: KeyDownData<any>) => void) => this.on(`${this.UUID}.longPress`, callback);

	// -- Optional methods called on socket connected/disconnected and on context appear/disappear/update
	async onSocketConnected?(socketIdx: number): Promise<void>
	async onSocketDisconnected?(socketIdx: number): Promise<void>
	async onContextAppear?(context: string, contextData: ContextData<T>): Promise<void>
	async onContextDisappear?(context: string): Promise<void>
	async onContextSettingsUpdated?(context: string, contextData: ContextData<T>): Promise<void>

	protected async getForegroundImage?(context: string): Promise<string | undefined>;

	/**
	 * Triggers when PI has imported everything and is ready to be shown to the user
	 */
	protected async onPropertyInspectorReady?({ context, action }: { context: string, action: string }): Promise<void>

	// -- Getters/setters
	protected get contexts() {
		return this._contexts;
	}

	protected setContextSocketState(context: string, socketIdx: number, state: StateEnum) {
		const contextData = this._contexts.get(context);
		if (!contextData) return;
		contextData.states[socketIdx] = state; // Update cache
		this._updateSDState(context, contextData);	// update internal SD state
	}
	// --

	// -- General helpers
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
	// --

	/**
	 * Update key title with the corresponding settings param string, depending on configured target
	 */
	private _updateTitle(context: string, settingsParam: string | undefined) {
		if (!settingsParam) return;
		const contextData = this._contexts.get(context);
		if (!contextData || contextData.isInMultiAction) return;	// to-do: also check if a title associated param is defined for this class object

		const titles = contextData.settings
		.filter(socketSettings => socketSettings)
		.map(socketSettings => socketSettings![settingsParam] as string || '?');

		const title = [...new Set(titles)].join('\n········\n');
		SDUtils.setKeyTitle(context, title);
	}
	// --

	// -- States
	/**
	 * Fetch the current states associated with an action, for all OBS instances.
	 * Never rejects
	 * @param settings Action settings
	 * @returns
	 */
	private async _fetchStates(settings: (SocketSettings<T> | null)[]): Promise<StateEnum[]> {
		const statesResults = await Promise.allSettled(settings.map((socketSettings, idx) => {
			return this._fetchSocketState(socketSettings, idx);
		}));
		return statesResults.map(res => res.status === 'fulfilled' ? res.value : StateEnum.Unavailable);
	}

	/**
	 * Utility wrapper around fetchState. Don't override
	 */
	private async _fetchSocketState(socketSettings: SocketSettings<T> | null, socketIdx: number): Promise<StateEnum> {
		if (!socketSettings || !sockets[socketIdx].isConnected) return StateEnum.Unavailable;
		return this.fetchState ? this.fetchState(socketSettings, socketIdx) : StateEnum.None;
	}

	// Update SD state - active (0) only if all target states are active
	private _updateSDState(context: string, contextData: ContextData<unknown>) {
		const { targetObs, states } = contextData;
		const sdState = states.filter((_, i) => targetObs === 0 || targetObs - 1 === i).every(state => state === StateEnum.Active) ? 0 : 1;
		$SD.setState(context, sdState);
	}
	// --

	// -- Images update
	/**
	 * Get default action key image, defined in the manifest.json, as SVG string
	 */
	private async _getDefaultKeyImage(): Promise<string> {
		const actionName = this.UUID.split('.').at(-1);
		const key = (await import(`../assets/actions/${actionName}/key.svg`)).default;
		return key;
	}

	/**
	 * Update the context key image.
	 * The update is not immediate, it's queued in a small buffer to improve sync and avoid unneeded messages to SD
	 * @param context Action context
	 */
	protected async updateKeyImage(context: string): Promise<void> {
		const image = await this._generateKeyImage(context).catch(e => { console.error(`Error updating key image for context ${context}: ${e}`); });
		if (!image) return;
		AbstractBaseWsAction._dirtyImages.set(context, image);
		if (AbstractBaseWsAction._dirtyImages.size === 1) {
			setTimeout(() => {
				for (const [ctx, img] of AbstractBaseWsAction._dirtyImages) {
					$SD.setImage(ctx, img);
					AbstractBaseWsAction._dirtyImages.delete(ctx);
				}
			}, 15);
		}
	}

	/**
	 * Update key images for all action contexts in cache.
	 */
	protected updateImages(): void {
		for (const [context] of this._contexts) {
			this.updateKeyImage(context);
		}
	}

	private async _generateKeyImage(context: string) {
		if (!this._contexts.has(context)) return;
		const { states, targetObs } = this._contexts.get(context)!;

		// State rectangles
		let bgLayer = '', fgLayer = '';
		if (states) {
			if (targetObs !== 0) {
				if (states[targetObs - 1] === StateEnum.Unavailable) {
					fgLayer += SVGUtils.createVPattern();
				}
				else {
					bgLayer += `<rect x="0" y="0" width="144" height="144" fill="${states[targetObs - 1] === StateEnum.Inactive ? this._statesColors.off : states[targetObs - 1] === StateEnum.Intermediate ? this._statesColors.intermediate : this._statesColors.on}"/>`;
					if (states[targetObs - 1] === StateEnum.Inactive) {
						fgLayer += '<rect x="0" y="0" width="144" height="144" fill="black" fill-opacity="0.33"/>';
					}
				}
			}
			else {
				for (let i = 0; i < states.length; i++) {
					if (states[i] === StateEnum.Unavailable) {
						fgLayer += SVGUtils.createVPattern(i / 2, (i + 1) / 2);
					}
					else {
						bgLayer += `<rect x="${144 * i / 2}" y="0" width="${144 * (i + 1) / 2}" height="144" fill="${states[i] === StateEnum.Inactive ? this._statesColors.off : states[i] === StateEnum.Intermediate ? this._statesColors.intermediate : this._statesColors.on}"/>`;
						if (states[i] === StateEnum.Inactive) {
							fgLayer += `<rect x="${144 * i / 2}" y="0" width="${144 * (i + 1) / 2}"  height="144" fill="black" fill-opacity="0.33"/>`;
						}
					}
				}
			}
		}

		// Target numbers
		let targetsText = '';
		if (!this._hideTargetIndicators && globalSettings.targetNumbers !== 'hide') {
			const pos = globalSettings.targetNumbers ?? 'top';

			const yPos = pos === 'top' ? 28 : pos === 'middle' ? 144 / 2 + 10 : 144 - 10;
			if (targetObs === 0 || targetObs === 1) {
				targetsText += `<text x="${0 + 10}" y="${yPos}" text-anchor="start" font-size="24" font-family="Arial, sans-serif" font-weight="bold" fill="#efefef">1</text>`;
			}
			if (targetObs === 0 || targetObs === 2) {
				targetsText += `<text x="${144 - 10}" y="${yPos}" text-anchor="end" font-size="24" font-family="Arial, sans-serif" font-weight="bold" fill="#efefef">2</text>`;
			}
		}

		const svgStr = `
		<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
			${bgLayer}
			${this.getForegroundImage ? await this.getForegroundImage(context) : this._defaultKeyImg?.replace(/<\/?svg.*?>/g, '')}
			${targetsText}
			${fgLayer}
		</svg>
		`;
		return `data:image/svg+xml;base64,${btoa(svgStr)}`;
	}
	// --

	// -- Methods related to stateful actions
	private _attachEventListener(statusEvent: keyof OBSEventTypes) {
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
								this.setContextSocketState(context, evtSocketIdx, newState);
								this.updateKeyImage(context);
							}
						}
					}
					catch (e) {
						console.error(`Error getting state from event: ${e}`);
					}
				}
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