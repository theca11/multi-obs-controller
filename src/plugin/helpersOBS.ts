import { sockets } from './sockets';

export async function getScenesLists() {
	const results = await Promise.allSettled(
		sockets.map(socket => socket.isConnected ? socket.call('GetSceneList') : Promise.reject())
	)
	return results.map(result => result.status === 'fulfilled' ? result.value.scenes : []);
}

export async function getSceneItemsList(socketIdx: number, sceneName: string) {
	const socket = sockets[socketIdx];
	const data = await socket.call('GetSceneItemList', { sceneName: sceneName }).catch(() => {return { sceneItems: []}})
	return data.sceneItems;
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