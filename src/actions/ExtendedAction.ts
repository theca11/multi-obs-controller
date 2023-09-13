import { DidReceiveGlobalSettingsData, GlobalSettings, KeyDownData, KeyUpData } from './types';
import { EventEmitter as EvtEmitter } from 'eventemitter3';

let globalSettings: GlobalSettings = {};
$SD.onDidReceiveGlobalSettings(({ payload }: DidReceiveGlobalSettingsData<GlobalSettings>) => {
	globalSettings = payload.settings;
});

export class ExtendedAction extends Action {
	_pressCache = new Map<string, NodeJS.Timeout>(); // <context, timeoutRef>
	_eventEmitter = new EvtEmitter();

	constructor(UUID?: string) {
		super(UUID ?? 'dev.theca11.multiobs.extended');

		// -- Main logic when key is pressed --
		this.onKeyDown((evtData: KeyDownData<{ advanced: { longPressMs?: string }}>) => {
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

	}

	onSinglePress = (callback: (evtData: KeyUpData<any>) => void) => this._eventEmitter.on('singlePress', callback);
	onLongPress = (callback: (evtData: KeyDownData<any>) => void) => this._eventEmitter.on('longPress', callback);
}