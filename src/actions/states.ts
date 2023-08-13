import { EventEmitter } from 'eventemitter3';
import { Socket, sockets } from "../plugin/sockets";
import { OBSResponseTypes } from 'obs-websocket-js';

export const evtEmitter = new EventEmitter();

let streamStates: (boolean | null | undefined)[] = [null, null];	// to-do: don't hardcore these sizes
let recordStates: (boolean | null | undefined)[] = [null, null];
let currentProgramScenes: (string | null | undefined)[] = [null, null];

async function initialize(socket: Socket, i: number) {
	streamStates[i] = (await socket.call('GetStreamStatus').catch(() => {}) as OBSResponseTypes['GetStreamStatus']).outputActive ?? null;
	recordStates[i] = (await socket.call('GetRecordStatus').catch(() => {}) as OBSResponseTypes['GetRecordStatus']).outputActive ?? null;
	currentProgramScenes[i] = (await socket.call('GetCurrentProgramScene').catch(() => {}) as OBSResponseTypes['GetCurrentProgramScene']).currentProgramSceneName ?? null;
}

// Attach event listeners
sockets.forEach((socket, i) => {
	socket.on('Identified', async () => {
		await initialize(socket, i);
		evtEmitter.emit('SocketInitialized', i);
	})
	// @ts-expect-error
	socket.on('Disconnected', () => {
		evtEmitter.emit('SocketDisconnected', i);
	})
	socket.on('StreamStateChanged', ({ outputActive }) => {
		streamStates[i] = outputActive;
		evtEmitter.emit('StreamStateChanged', i, { outputActive });
	})
	socket.on('RecordStateChanged', ({ outputActive }) => {
		recordStates[i] = outputActive;
		evtEmitter.emit('RecordStateChanged', i, { outputActive });
	})
	socket.on('CurrentProgramSceneChanged', ({ sceneName }) => {
		currentProgramScenes[i] = sceneName;
		evtEmitter.emit('CurrentProgramSceneChanged', i, { sceneName });
	})
	socket.on('SceneItemEnableStateChanged', ({ sceneName, sceneItemId, sceneItemEnabled }) => {
		evtEmitter.emit('SceneItemEnableStateChanged', i, { sceneName, sceneItemId, sceneItemEnabled });
	})
	socket.on('InputMuteStateChanged', ({ inputName, inputMuted }) => {
		evtEmitter.emit('InputMuteStateChanged', i, { inputName, inputMuted });
	})
})


export function getStreamState(socketIdx: number) { return streamStates[socketIdx]; }
export function getRecordState(socketIdx: number) { return recordStates[socketIdx]; }
export function getCurrentScene(socketIdx: number) { return currentProgramScenes[socketIdx]; }

export async function getInputMuteState(socketIdx: number, inputName: string) {
	if (inputName && sockets[socketIdx].isConnected) {
		try {
			const { inputMuted } = await sockets[socketIdx].call('GetInputMute', { inputName });
			return inputMuted;
		}
		catch {
			return Promise.reject();
		}
	}
	else {
		return Promise.reject();
	}
}

export async function getSceneItemEnableState(socketIdx: number, sceneName: string, sourceName: string) {
	if (sceneName && sourceName && sockets[socketIdx].isConnected) {
		try {
			const batchResults = await sockets[socketIdx].callBatch([
				{
					requestType: 'GetSceneItemId',
					requestData: { sceneName, sourceName },
					// @ts-ignore
					outputVariables: { sceneItemIdVariable: 'sceneItemId' }
				},
				{
					requestType: 'GetSceneItemEnabled',
					// @ts-ignore
					requestData: { sceneName },
					inputVariables: { sceneItemId: 'sceneItemIdVariable' },
				}
			]);
			return (batchResults.at(-1)?.responseData as OBSResponseTypes['GetSceneItemEnabled']).sceneItemEnabled ?? Promise.reject()
		}
		catch {
			return Promise.reject();
		}
	}
	else {
		return Promise.reject();
	}
}

export async function getSceneItemId(socketIdx: number, sceneName: string, sourceName: string) {
	const { sceneItemId } = await sockets[socketIdx].call('GetSceneItemId', { sceneName, sourceName }).catch(() => null) as OBSResponseTypes['GetSceneItemId'];
	return sceneItemId;
}