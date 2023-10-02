import { sockets } from '../plugin/sockets';
import { CanvasUtils, ImageUtils, SDUtils } from '../plugin/utils';
import { StateEnum } from './StateEnum';
import { globalSettings } from './globalSettings';
import { evtEmitter } from './states';
import { ConstructorParams, DidReceiveSettingsData, KeyDownData, KeyUpData, PartiallyRequired, PersistentSettings, SendToPluginData, WillAppearData, WillDisappearData } from './types';
import { EventEmitter as EvtEmitter } from 'eventemitter3';

interface ContextData {
	targetObs: number,
	isInMultiAction: boolean,
	settings: any[],
	states: StateEnum[]
}

export abstract class AbstractBaseWsAction extends Action {
	_pressCache = new Map<string, NodeJS.Timeout>(); // <context, timeoutRef>
	_eventEmitter = new EvtEmitter();	// to-do: remove and use the internal eventEmitter emit/on functions?

	_contexts = new Map<string, ContextData>();

	_titleParam: string | undefined;
	_statesColors = { on: '#517a96', off: '#2b3e4b' };

	_showSuccess = true;

	constructor(UUID: string, params?: Partial<ConstructorParams>) {
		super(UUID);
		this._titleParam = params?.titleParam;
		this._statesColors = { ...this._statesColors, ...params?.statesColors };

		// -- Main logic when key is pressed --
		this.onKeyDown((evtData: KeyDownData<{ advanced: { longPressMs?: string } }>) => {
			const { context, payload } = evtData;
			const { settings } = payload;

			if (this._pressCache.has(context)) return;

			const timeout = setTimeout(() => {
				console.log('long press');
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
				console.log('single press');
				this._eventEmitter.emit('singlePress', evtData);
			}

		});
		// --

		// -- Contexts cache --
		this.onWillAppear(async (evtData: WillAppearData<any>) => {
			const { context, payload } = evtData;
			const { settings, isInMultiAction } = payload;
			const contextData: ContextData = {
				targetObs: this.getTarget(settings),
				isInMultiAction: !!isInMultiAction,
				settings: this.getSettingsArray(settings),
				states: await this.fetchStates(settings),
			};
			this._contexts.set(context, contextData);
			this.updateTitle(context, this._titleParam);
			const img = await this.getDefaultKeyImage();
			this.updateKeyImage(context, contextData.targetObs, img);
		});

		this.onWillDisappear((evtData: WillDisappearData<any>) => {
			const { context } = evtData;
			this._contexts.delete(context);
		});

		this.onDidReceiveSettings(async (evtData: DidReceiveSettingsData<any>) => {
			const { context, payload } = evtData;
			const { settings, isInMultiAction } = payload;
			const contextData: ContextData = {
				targetObs: this.getTarget(settings),
				isInMultiAction: !!isInMultiAction,
				settings: this.getSettingsArray(settings),
				states: await this.fetchStates(settings),
			};
			this._contexts.set(context, contextData);
			this.updateTitle(context, this._titleParam);
			const img = await this.getDefaultKeyImage();
			this.updateKeyImage(context, contextData.targetObs, img);
		});
		// --

		// -- Sockets connected/disconnected
		evtEmitter.on('SocketInitialized', async (socketIdx) => {
			for (const [context, { settings }] of this._contexts) {
				const newState = await this.fetchSocketState(settings[socketIdx], socketIdx).catch(() => StateEnum.Unavailable);
				this._updateSocketState(context, socketIdx, newState);
			}
			this.updateImages();
		});

		evtEmitter.on('SocketDisconnected', (socketIdx) => {
			for (const [context] of this._contexts) {
				this._updateSocketState(context, socketIdx, StateEnum.Unavailable);
			}
			this.updateImages();
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
			this.attachEventListener(statusEvent);
		}

	}

	onSinglePress = (callback: (evtData: KeyUpData<any>) => void) => this._eventEmitter.on('singlePress', callback);
	onLongPress = (callback: (evtData: KeyDownData<any>) => void) => this._eventEmitter.on('longPress', callback);

	// -- General helpers --
	getCommonSettings(settings: PersistentSettings) {
		settings = settings ?? {};
		return {
			target: parseInt(settings.common?.target || globalSettings.defaultTarget || '0'),
			indivParams: !!settings.common?.indivParams,
		};
	}

	getTarget(settings: PersistentSettings): number {
		return this.getCommonSettings(settings).target;
	}

	getSettingsArray(settings: PersistentSettings) {
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

		const title = contextData.settings
		.filter(socketSettings => socketSettings)
		.map(socketSettings => socketSettings[settingsParam] as string || '?')
		.join('\n');

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

	_setContextSettings(context: string, settings: any[]) {
		if (!this._contexts.has(context)) return;
		this._contexts.get(context)!.settings = settings;
	}

	_getContextStates(context: string) {
		return this._contexts.get(context)?.states;
	}

	_setContextStates(context: string, states: any[]) {
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
	async fetchStates(settings: PersistentSettings): Promise<StateEnum[]> {
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

	/**
	 * Update key images for all action contexts in cache.
	 */
	async updateImages(): Promise<void> {
		try {
			const img = await this.getDefaultKeyImage();
			for (const [context, contextData] of this._contexts) {
				this.updateKeyImage(context, contextData.targetObs, img);
			}
		}
		catch (e) {
			console.error(`Error updating key images: ${e}`);
		}
	}


	updateKeyImage(context: string, target: number, img: HTMLImageElement) {
		const states = this._contexts.get(context)?.states;

		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.globalCompositeOperation = 'source-over';

		canvas.width = 144;
		canvas.height = 144;

		// Draw image to canvas
		ctx.drawImage(img, 0, 0);

		// Draw target numbers
		if (globalSettings.targetNumbers !== 'hide') {
			ctx.globalCompositeOperation = 'source-over';
			ctx.fillStyle = '#efefef';
			ctx.font = 'bold 25px Arial';
			ctx.textBaseline = 'top';
			if (target === 0 || target === 1) {
				ctx.textAlign = 'left';
				ctx.fillText('1', 0 + 10, 10);
			}
			if (target === 0 || target === 2) {
				ctx.textAlign = 'right';
				ctx.fillText('2', 144 - 10, 10);
			}
		}

		// Draw target state
		if (states) {
			if (target !== 0) {
				if (states[target - 1] === StateEnum.Unavailable) {
					CanvasUtils.drawLineVPatternRect(ctx, 0, 1);
				}
				else {
					if (states[target - 1] === StateEnum.Inactive) {
						CanvasUtils.drawColorRect(ctx, '#a0a0a0', 0, 1, 'source-atop');
					}
					CanvasUtils.drawColorRect(ctx, states[target - 1] === StateEnum.Inactive ? this._statesColors.off : this._statesColors.on, 0, 1, 'destination-over');
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
						CanvasUtils.drawColorRect(ctx, states[i] === StateEnum.Inactive ? this._statesColors.off : this._statesColors.on, i / 2, (i + 1) / 2, 'destination-over');
					}
				}
			}
		}

		// Get base64 img and set image
		const b64 = canvas.toDataURL('image/png', 1);
		$SD.setImage(context, b64);
	}
	// --

	// -- Optional functions for stateful actions

	// Attach listener to status event to update key image
	attachEventListener(statusEvent: string) {
		if (!this.shouldUpdateState || !this.getStateFromEvent) return;
		evtEmitter.on(statusEvent, async (evtSocketIdx, evtData) => {
			const img = await this.getDefaultKeyImage();

			for (const [context, { settings, states, targetObs }] of this._contexts) {
				try {
					const socketSettings = settings[evtSocketIdx];
					if (socketSettings && await this.shouldUpdateState!(evtData, socketSettings, evtSocketIdx)) {
						const newState = await this.getStateFromEvent!(evtData, socketSettings);
						states[evtSocketIdx] = newState;
						this._setContextStates(context, states);
						this.updateKeyImage(context, targetObs, img);
					}
				}
				catch (e) {
					console.error(`Error getting state from event: ${e}`);
				}
			}
		});
	}

	/**
	 * Fetch the current OBS state associated with the action (e.g. if scene is visible).
	 * Rejects on fetching error.
	 * @param socketSettings Action settings for the target OBS
	 * @param socketIdx Index of the OBS instance to fetch settings from
	 * @returns None/Active/Inactive
	 */
	async fetchState?(socketSettings: Record<string, any>, socketIdx: number): Promise<Exclude<StateEnum, StateEnum.Unavailable>>;

	/**
	 * Whether a received event should trigger an state update an action
	 * @param evtData Event data
	 * @param socketSettings Action settings for the corresponding socket
	 * @param socketIdx Socket index
	 */
	async shouldUpdateState?(evtData: any, socketSettings: any, socketIdx: number): Promise<boolean>;

	/**
	 * Get state associated with the action from the event that notifies a state update
	 * @param evtData Event data
	 * @param socketSettings Action settings for the corresponding socket
	 * @returns New true/false state
	 */
	async getStateFromEvent?(evtData: Record<string, any>, socketSettings: Record<string, any>): Promise<StateEnum>;
	// --
}


export { AbstractBaseWsAction as AbstractStatelessAction };

export abstract class AbstractStatefulAction extends AbstractBaseWsAction {

	constructor(UUID: string, params: PartiallyRequired<ConstructorParams, 'statusEvent'>) {
		super(UUID, params);
		this._showSuccess = false;	// success already shown via event updates
	}

	abstract override fetchState(socketSettings: Record<string, any>, socketIdx: number): Promise<StateEnum.Active | StateEnum.Inactive>;
	abstract override shouldUpdateState(evtData: any, socketSettings: any, socketIdx: number): Promise<boolean>;
	abstract override getStateFromEvent(evtData: Record<string, any>, socketSettings: Record<string, any>): Promise<StateEnum>;
}