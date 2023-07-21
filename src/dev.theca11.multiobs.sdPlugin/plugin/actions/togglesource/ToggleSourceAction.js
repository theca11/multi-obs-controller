import { OBSWebsocketAction } from '../OBSWebsocketAction.js';
import { getScenesLists, getSceneItemsList } from '../../helpersOBS.js';

export class ToggleSourceAction extends OBSWebsocketAction {
	constructor() {
		super('dev.theca11.multiobs.togglesource', 'sourceName');

		this.onSendToPlugin(async ({payload, context, action}) => {
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

	getPayloadFromSettings(settings, desiredState) {
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

	async sendWsRequests(target, payloadsArray) {
		const requestType = payloadsArray[0].requests[1].requestType;
		if (requestType === 'SetSceneItemEnabled')
			return super.sendWsRequests(target, payloadsArray);

		const sceneNames = payloadsArray.map((p) => p.requests[0].requestData.sceneName);
		const firstBatchResults = await super.sendWsRequests(target, payloadsArray);
		const secondBatchPayloadsArray = [];
		firstBatchResults.flat().map((r, idx) => {
			const obsResponse = r.value;
			if (obsResponse) {
				const sceneItemId = obsResponse[0].responseData?.sceneItemId;
				const sceneItemEnabled = obsResponse[1].responseData?.sceneItemEnabled;
				secondBatchPayloadsArray.push({
					requestType: 'SetSceneItemEnabled',
					requestData: {
						sceneName: sceneNames[idx],
						sceneItemId: sceneItemId,
						sceneItemEnabled: !sceneItemEnabled,
					},
				});
			}
			else {
				secondBatchPayloadsArray.push({});
			}

		});
		return super.sendWsRequests(target, secondBatchPayloadsArray);
	}

	async onPropertyInspectorReady({context, action}) {
		const scenesLists = await getScenesLists();
		const payload = { event: 'SceneListLoaded', scenesLists: scenesLists };
		$SD.sendToPropertyInspector(context, payload, action);
	}
}
