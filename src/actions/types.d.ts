// --- StreamDeck lib types for events ---
type Common = {
	action: string,
	event: string,
	context: string,
	device: string,
}
type Payload<T> = {
	payload: {
		coordinates: { column: number, row: number },
		isInMultiAction: boolean,
		state?: number,
		settings: T
	}
}
type TriggerPayload<T> = Payload<T> & { payload: { userDesiredState?: number } }
type BaseEventData<T> = Common & Payload<T>
type TriggerEventData<T> = Common & TriggerPayload<T>

export type DidReceiveSettingsData<T> = BaseEventData<T>;
export type DidReceiveGlobalSettingsData<T> = {
	event: string,
	payload: { settings: T }
}
export type KeyDownData<T> = TriggerEventData<T>;
export type KeyUpData<T> = TriggerEventData<T>;
export type WillAppearData<T> = BaseEventData<T>;
export type WillDisappearData<T> = BaseEventData<T>;
export type SendToPluginData<T> = {
	action: string,
	event: string,
	context: string,
	payload: T
}
export type SendToPIData<T> = {
	action: string,
	event: string,
	context: string,
	payload: T
}
// ---

// --- MultiOBS types ---
export type PersistentSettings<T> = Partial<{
	common: {
		target?: string,
		indivParams?: 'true'
	},
	advanced: {
		longPress?: 'true',
		longPressMs?: string
	}
	[key: `params${number}`]: Partial<T>
}>
export type GlobalSettings = Partial<{
	[key: `ip${number}`]: string,
	[key: `port${number}`]: string,
	[key: `pwd${number}`]: string
	defaultTarget: string,
	longPressMs: string,
	feedback: 'hide',
	targetNumbers: 'bottom' | 'middle' | 'top' | 'hide'
}>

export type SocketSettings<T> = Partial<T> | Record<string, never>;
export interface ContextData<T> {
	targetObs: number;
	isInMultiAction: boolean;
	settings: (SocketSettings<T> | null)[];
	states: StateEnum[];
}

export type RequestPayload = SingleRequestPayload<T> | BatchRequestPayload | null;
export type SingleRequestPayload<T extends keyof OBSRequestTypes> = {
	requestType: T,
	requestData?: OBSRequestTypes[T]
}
export type BatchRequestPayload = {
	requests: RequestBatchRequest[],
	options?: RequestBatchOptions
}


export type ConstructorParams = {
	titleParam?: string,
	statusEvent?: keyof OBSEventTypes,
	statesColors?: {
		on?: string,
		off?: string
	},
	hideTargetIndicators?: boolean
}

export type PartiallyRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
export type Input = { inputName: string; inputKind: string; unversionedInputKind: string; };

// ---
