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
export type PersistentSettings = Partial<{
	common: {
		target?: string,
		indivParams?: 'true'
	},
	[paramsNum: string]: Record<string, any>
}>
export type GlobalSettings = Partial<{
	ip1: string,
	port1: string,
	pwd1: string,
	ip2: string,
	port2: string,
	pwd2: string,
	feedback: 'hide'
}>

export type RequestPayload = SingleRequestPayload<any> | BatchRequestPayload | null;
export type SingleRequestPayload<Type extends keyof OBSRequestTypes> = {
	requestType: Type,
	requestData?: OBSRequestTypes[Type]
}
export type BatchRequestPayload = {
	requests: RequestBatchRequest[],
	options?: RequestBatchOptions
}


export type ConstructorParams = {
	titleParam?: string,
	statusEvent?: string,
}

export type PartiallyRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

export type State = boolean | null | undefined

// ---
