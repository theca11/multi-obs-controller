import { SDUtils } from "./utils.js";

class Socket extends OBSWebSocket {
	_ip;
	_port;
	_password;
	_isConnected = false;

	constructor(ip, port, password) {
		super();
		this._ip = ip;
		this._port = port;
		this._password = password;

		this.on('Identified', () => {
			this._isConnected = true;
			const logStr = `[CONNECTED] OBS Websocket server at ${this._ip}:${this._port}`;
			SDUtils.log(logStr);
		});

		this.on('ConnectionClosed', () => {
			if (this._isConnected) {
				const logStr = `[DISCONNECTED] OBS Websocket server at ${this._ip}:${this._port}`; 
				SDUtils.log(logStr);
				this.emit('Disconnected');
			}
			this._isConnected = false;
		});
	}

	get isConnected() {
		return this._isConnected;
	}

	/**
	 * Connect WS, if not already connected and if valid ip/port
	 */
	tryConnect() {
		if (this._isConnected || !this._ip || !this._port) return;
		this.connect(`ws://${this._ip}:${this._port}`, this._password)
		.catch(() => { /* Error while connecting - logs on socket events */ });
	}

	/**
	 * Update ip/port/pwd settings, and reconnect if needed
	 * @param {string} ip 
	 * @param {string} port 
	 * @param {string?} password 
	 */
	updateSettings(ip, port, password) {
		if (this._ip !== ip || this._port !== port || this._password !== password) {
			this._ip = ip;
			this._port = port;
			this._password = password;
			if (!this._ip || !this._port) {
				this.disconnect().catch(() => { /* Error while disconnecting */ });
			}
			else {
				this.connect(`ws://${this._ip}:${this._port}`, this._password)
				.catch(() => { /* Error while connecting - logs on socket events */ });
			}
		}
	}
}

// to-do: find hardcoded "2" in the code and substitute with this const
export const NUM_SOCKETS = 2;
export const sockets = new Array(NUM_SOCKETS).fill().map(() => new Socket());