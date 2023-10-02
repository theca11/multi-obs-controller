import { DidReceiveGlobalSettingsData, GlobalSettings } from './types';

export let globalSettings: GlobalSettings = {};

$SD.onDidReceiveGlobalSettings(({ payload }: DidReceiveGlobalSettingsData<GlobalSettings>) => {
	globalSettings = payload.settings;
});