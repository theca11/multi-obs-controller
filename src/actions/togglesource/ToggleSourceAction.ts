import { OBSWebsocketAction } from '../OBSWebsocketAction';
import { getScenesLists, getSceneItemsList } from '../lists';
import { getSceneItemEnableState, getSceneItemId } from '../states';
import { BatchRequestPayload, RequestPayload, SendToPluginData } from '../types.js';

export class ToggleSourceAction extends OBSWebsocketAction {
	constructor() {
		super('dev.theca11.multiobs.togglesource', { titleParam: 'sourceName', statusEvent: 'SceneItemEnableStateChanged' });

		this.onSendToPlugin(async ({payload, context, action}: SendToPluginData<{event: string, socketIdx: number, sceneName: string}>) => {
			if (payload.event === 'GetSceneItemsList') {
				const sceneItems = await getSceneItemsList(payload.socketIdx, payload.sceneName);
				const piPayload = { 
					event: 'SourceListLoaded',
					idx: payload.socketIdx,
					sourceList: sceneItems.map(o => o.sourceName)
				};
				$SD.sendToPropertyInspector(context, piPayload, action);
			}
		})
	}

	getPayloadFromSettings(settings: any, desiredState?: number | undefined) {
		const { sceneName, sourceName } = settings;
		if (desiredState === 0 || desiredState === 1) {
			return {
				requests: [
					{
						requestType: 'GetSceneItemId',
						requestData: { sceneName: sceneName, sourceName: sourceName },
						outputVariables: { sceneItemIdVariable: 'sceneItemId' },
					},
					{
						requestType: 'SetSceneItemEnabled',
						requestData: {
							sceneName: sceneName,
							sceneItemEnabled: desiredState === 0 ? true : false,
						},
						inputVariables: { sceneItemId: 'sceneItemIdVariable' },
					},
				]
			};
		} else {
			return {
				requests: [
					{
						requestType: 'GetSceneItemId',
						requestData: { sceneName: sceneName, sourceName: sourceName },
						outputVariables: { sceneItemIdVariable: 'sceneItemId' },
					},
					{
						requestType: 'GetSceneItemEnabled',
						requestData: { sceneName: sceneName },
						inputVariables: { sceneItemId: 'sceneItemIdVariable' },
					},
				]
			};
		}
	}

	// to-do: fix this method now that payloadsArray can contain null values
	async sendWsRequests(payloadsArray: BatchRequestPayload[]): Promise<PromiseSettledResult<any>[]> {
		const requestType = payloadsArray.find(payload => payload)?.requests[1].requestType;
		// const requestType = payloadsArray[0].requests[1].requestType;
		if (requestType === 'SetSceneItemEnabled')
			return super.sendWsRequests(payloadsArray);

		const sceneNames = payloadsArray.map((p) => p ? p.requests[0].requestData.sceneName : null);
		const firstBatchResults = await super.sendWsRequests(payloadsArray);
		// const secondBatchPayloadsArray = [];
		const secondBatchPayloadsArray = firstBatchResults.flat().map((r, idx) => {
			if (!payloadsArray[idx]) {
				return null;
			}
			const obsResponse = (r as PromiseFulfilledResult<any>).value;
			if (obsResponse) {
				const sceneItemId = obsResponse[0].responseData?.sceneItemId;
				const sceneItemEnabled = obsResponse[1].responseData?.sceneItemEnabled;
				return {
					requestType: 'SetSceneItemEnabled',
					requestData: {
						sceneName: sceneNames[idx],
						sceneItemId: sceneItemId,
						sceneItemEnabled: !sceneItemEnabled,
					},
				};
			}
			else {
				return { requestType: 'InvalidRequest', requestData: {} };
			}
		});
		return super.sendWsRequests(secondBatchPayloadsArray);
	}

	async onPropertyInspectorReady({ context, action }: { context: string; action: string; }): Promise<void> {
		const scenesLists = await getScenesLists();
		const payload = { event: 'SceneListLoaded', scenesLists: scenesLists };
		$SD.sendToPropertyInspector(context, payload, action);
	}

	async fetchState(socketSettings: any, socketIdx: number): Promise<boolean | null | undefined> {
		return getSceneItemEnableState(socketIdx, socketSettings.sceneName, socketSettings.sourceName);
	}

	// async getStates(settings) {
	// 	const settingsArray = this.getSettingsArray(settings);
	// 	return getSceneItemEnableStates(settingsArray.map(s => s?.sceneName ?? null), settingsArray.map(s => s?.sourceName ?? null));
	// }

	async shouldUpdateImage(evtData: any, socketSettings: any, socketIdx: number): Promise<boolean> {
		const { sceneName, sourceName } = socketSettings;
		if (sceneName && sourceName && sceneName === evtData.sceneName) {
			const sceneItemId = await getSceneItemId(socketIdx, sceneName, sourceName);
			if (sceneItemId && sceneItemId === evtData.sceneItemId) return true;
		}
		return false;
	}

	async getNewState(evtData: any, socketSettings: any): Promise<boolean> {
		return evtData.sceneItemEnabled;
	}
}
