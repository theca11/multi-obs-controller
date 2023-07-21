import { sockets } from './sockets.js';

export async function getScenesLists() {
	const results = await Promise.allSettled(
		sockets.map(socket => socket.isConnected ? socket.call('GetSceneList') : Promise.reject())
	)
	return results.map(result => result.status === 'fulfilled' ? result.value.scenes : []);
}

export async function getSceneItemsList(socketIdx, sceneName) {
	const socket = sockets[socketIdx];
	const data = await socket.call('GetSceneItemList', { sceneName: sceneName }).catch(() => {return {}})
	return data.sceneItems ?? [];
}

export async function getCollectionsLists() {
	const results = await Promise.allSettled(
		sockets.map(socket => socket.isConnected ? socket.call('GetSceneCollectionList') : Promise.reject())
	)
	return results.map(result => result.status === 'fulfilled' ? result.value.sceneCollections : []);
}

export async function getInputsLists() {
	const results = await Promise.allSettled(
		sockets.map(socket => socket.isConnected ? socket.call('GetInputList') : Promise.reject())
	)
	return results.map(result => result.status === 'fulfilled' ? result.value.inputs : []);
}