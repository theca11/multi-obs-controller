import { sockets } from '../plugin/sockets';

/**
 * Get a list of all collections in all OBS instances
 * @returns One array of collection names per OBS instance
 */
export async function getCollectionsLists() {
	const results = await Promise.allSettled(
		sockets.map(socket => socket.isConnected ? socket.call('GetSceneCollectionList') : Promise.reject())
	)
	return results.map(result => result.status === 'fulfilled' ? result.value.sceneCollections : []);
}

/**
 * Get a list of all scenes in all OBS instances
 * @returns One array of scenes per OBS instance. Each scene JsonObject contains sceneIndex and sceneName
 */
export async function getScenesLists() {
	const results = await Promise.allSettled(
		sockets.map(socket => socket.isConnected ? socket.call('GetSceneList') : Promise.reject())
	)
	return results.map(result => result.status === 'fulfilled' ? result.value.scenes : []);
}

/**
 * Get a list of all scene items in a particular scene
 * @param socketIdx Index identifying the OBS instance
 * @param sceneName Scene to list all scene items
 * @returns One array of scene items. Each scene item JsonObject contains sceneItemId and sourceName (among others)
 */
export async function getSceneItemsList(socketIdx: number, sceneName: string) {
	try {
		const data = await sockets[socketIdx].call('GetSceneItemList', { sceneName: sceneName });
		return data.sceneItems;
	}
	catch {
		return [];
	}
}

/**
 * Get a list of all inputs in all OBS instances
 * @returns One array of inputs per OBS instance. Each input JsonObject contains inputName, inputKind and unversionedInputKind
 */
export async function getInputsLists() {
	const results = await Promise.allSettled(
		sockets.map(socket => socket.isConnected ? socket.call('GetInputList') : Promise.reject())
	)
	return results.map(result => result.status === 'fulfilled' ? result.value.inputs : []);
}