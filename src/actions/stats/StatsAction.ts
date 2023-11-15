import { OBSResponseTypes } from 'obs-websocket-js';
import { sockets } from '../../plugin/sockets';
import { SVGUtils } from '../../plugin/utils';
import { AbstractStatelessAction } from '../BaseWsAction';
import { ContextData, SocketSettings } from '../types';

type ActionSettings = { stats: string[], colors: string[] }
type StatConfig = { target: number, stat: string, color: string }

export class StatsAction extends AbstractStatelessAction<ActionSettings> {

	private _ctxStatsSettings = new Map<string, StatConfig[]>();
	private _statsUpdateInterval: NodeJS.Timeout | null = null;

	private _generalStats: (OBSResponseTypes['GetStats'] | null)[] = new Array(sockets.length).fill(null);
	private _streamStats: (OBSResponseTypes['GetStreamStatus'] | null)[] = new Array(sockets.length).fill(null);
	private _recordStats: (OBSResponseTypes['GetRecordStatus'] | null)[] = new Array(sockets.length).fill(null);

	private _firstEncoded = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
	private _firstSkipped = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
	private _firstRendered = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
	private _firstLagged = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
	private _firstTotal = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
	private _firstDropped = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);

	constructor() {
		super('dev.theca11.multiobs.stats', { hideTargetIndicators: true });

		this.onLongPress(() => {
			this._resetStats();
		});
	}

	override async onContextAppear(context: string, contextData: ContextData<ActionSettings>): Promise<void> {
		this._ctxStatsSettings.set(context, this._formatStatSettings(contextData.settings));
		if (this._ctxStatsSettings.size === 1 && !this._statsUpdateInterval) {
			await this._fetchObsStats();
			this._statsUpdateInterval = setInterval(async () => {
				await this._fetchObsStats();
				this.updateImages();
			}, 2000);
		}
	}

	override async onContextDisappear(context: string): Promise<void> {
		this._ctxStatsSettings.delete(context);
		if (this._ctxStatsSettings.size === 0 && this._statsUpdateInterval) {
			clearInterval(this._statsUpdateInterval);
			this._statsUpdateInterval = null;
		}
	}

	override async onContextSettingsUpdated(context: string, contextData: ContextData<ActionSettings>): Promise<void> {
		this._ctxStatsSettings.set(context, this._formatStatSettings(contextData.settings));
	}

	override async onSocketConnected(): Promise<void> {
		return this._fetchObsStats();
	}

	override async onSocketDisconnected(socketIdx: number): Promise<void> {
		this._generalStats[socketIdx] = null;
		this._streamStats[socketIdx] = null;
		this._recordStats[socketIdx] = null;
	}

	// Format context settings into a combined array easier to parse later
	private _formatStatSettings(settingsArray: (SocketSettings<ActionSettings> | null)[]): StatConfig[] {
		const formattedStatsArray = settingsArray.flatMap((settings, socketIdx) => {
			if (!settings) return [];
			let { stats, colors } = settings as { stats: string | string[], colors: string | string[] };
			if (!stats) return [];
			if (!Array.isArray(stats)) stats = [stats];
			if (!Array.isArray(colors)) colors = [colors];
			const statObjArray: StatConfig[] = [];
			for (let i = 0; i < stats.length; i++) {
				statObjArray.push({ target: socketIdx + 1, stat: stats[i], color: colors[i] });
			}
			return statObjArray;
		}).filter(item => item !== null);
		return formattedStatsArray;
	}

	// Fetch OBS stats (general, stream, record)
	private async _fetchObsStats() {
		const batchResults = await Promise.allSettled(sockets.map(s =>
			s.isConnected
				? s.callBatch([
					{ requestType: 'GetStats' },
					{ requestType: 'GetStreamStatus' },
					{ requestType: 'GetRecordStatus' },
				])
				: Promise.reject(new Error('Error fetching stats')),
		));

		batchResults.map((res) => {
			if (res.status === 'fulfilled') {
				return res.value.map((r) => r.requestStatus.result === true ? r.responseData : null);
			}
			return null;
		}).forEach((responses, socketIdx) => {
			if (!responses) {
				this._generalStats[socketIdx] = null;
				this._streamStats[socketIdx] = null;
				this._recordStats[socketIdx] = null;
			}
			else {
				const [generalStats, streamStats, recordStats] = responses;
				this._generalStats[socketIdx] = (generalStats as OBSResponseTypes['GetStats']) ?? null;
				this._streamStats[socketIdx] = (streamStats as OBSResponseTypes['GetStreamStatus']) ?? null;
				this._recordStats[socketIdx] = (recordStats as OBSResponseTypes['GetRecordStatus']) ?? null;
			}
		});
	}

	// Reset stats of skipped/dropped frames
	private _resetStats() {
		this._firstEncoded = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
		this._firstSkipped = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
		this._firstRendered = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
		this._firstLagged = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
		this._firstTotal = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
		this._firstDropped = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
	}

	override async getForegroundImage(context: string) {
		const statsArr = this._ctxStatsSettings.get(context);
		if (!statsArr) return;

		const width = 144;
		const height = 144;
		const yStep = height / statsArr.length;
		let lastTarget = 1;
		let elements = '';

		for (const [idx, { target, stat, color }] of statsArr.entries()) {
			// Target separating line
			if (target !== lastTarget && idx !== 0) {
				elements += `<line x1="0" y1="${yStep * idx}" x2="${width}" y2="${yStep * idx}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-dasharray="4, 10"/>`;
			}
			lastTarget = target;

			// Get text string
			const text = this._getStatString(target - 1, stat) ?? '---';

			// Adjust font size and y-position dynamically
			const fontFamily = 'Arial';
			const fontWeight = '800';
			const testSize = 30;
			const textBBox = SVGUtils.getTextBbox(text, fontFamily, fontWeight, testSize, width, height);
			const widthScale = width * testSize / textBBox.width;
			const heightScale = yStep * testSize / (textBBox.height * 0.8);	// slightly tighter box than detected to remove some padding
			let scale = Math.floor(Math.min(widthScale, heightScale));
			if (text === '---') scale = Math.min(scale, 35);
			const yPos = Math.round(yStep * (idx + 1 / 2) + textBBox.height * scale * 0.25 / testSize);	// reposition to move text baseline to middle

			// Text external stroke + fill
			elements += `
			<text x="${width / 2}" y="${yPos}" text-anchor="middle" font-size="${scale}" font-family="${fontFamily}" font-weight="${fontWeight}" fill="black" stroke="black" stroke-width="6" stroke-linejoin="round">${text}</text>
			<text x="${width / 2}" y="${yPos}" text-anchor="middle" font-size="${scale}" font-family="${fontFamily}" font-weight="${fontWeight}" fill="${color}">${text}</text>
			`;
		}

		return elements;
	}

	// -- String generation
	private _getStatString(socketIdx: number, statName: string): string | undefined {
		const [group, name] = statName.split('.');
		if (group === 'general' && this._generalStats[socketIdx]) {
			return this._getGeneralStatString(this._generalStats[socketIdx]!, name, socketIdx);
		}
		else if (group === 'stream' && this._streamStats[socketIdx]) {
			return this._getStreamStatString(this._streamStats[socketIdx]!, name, socketIdx);
		}
		else if (group === 'record' && this._recordStats[socketIdx]) {
			return this._getRecordStatString(this._recordStats[socketIdx]!, name);
		}
	}

	private _getGeneralStatString(stats: OBSResponseTypes['GetStats'], name: string, socketIdx: number): string | undefined {
		switch (name) {
			case 'cpuUsage': {
				return stats[name].toFixed(1) + '%';
			}
			case 'memoryUsage': {
				return (stats[name] * 1024 * 1024 / 1024.01 / 1024.01).toFixed(1) + ' MB';
			}
			case 'availableDiskSpace': {
				const bytes = stats[name] * 1024 * 1024;
				if (bytes > 1024 * 1024 * 1024 * 1024) return (bytes / 1024.01 / 1024.01 / 1024.01 / 1024.01).toFixed(1) + ' TB';
				if (bytes > 1024 * 1024 * 1024) return (bytes / 1024.01 / 1024.01 / 1024.01).toFixed(1) + ' GB';
				return (bytes / 1024.01 / 1024.01).toFixed(1) + ' MB';
			}
			case 'activeFps': {
				return stats[name].toFixed(0) + ' FPS';
			}
			case 'averageFrameRenderTime': {
				return stats[name].toFixed(1) + ' ms';
			}
			case 'renderSkippedFrames': {
				let skipped = stats['renderSkippedFrames'];
				let total = stats['renderTotalFrames'];

				if (total < this._firstRendered[socketIdx] || skipped < this._firstLagged[socketIdx]) {
					this._firstRendered[socketIdx] = total;
					this._firstLagged[socketIdx] = skipped;
				}
				total -= this._firstRendered[socketIdx];
				skipped -= this._firstLagged[socketIdx];

				const percentage = total ? (skipped / total) * 100 : 0.01;
				return `${skipped} / ${percentage.toFixed(1)}%`;
			}
			case 'outputSkippedFrames': {
				let skipped = stats['outputSkippedFrames'];
				let total = stats['outputTotalFrames'];

				if (total < this._firstEncoded[socketIdx] || skipped < this._firstSkipped[socketIdx]) {
					this._firstEncoded[socketIdx] = total;
					this._firstSkipped[socketIdx] = skipped;
				}
				total -= this._firstEncoded[socketIdx];
				skipped -= this._firstSkipped[socketIdx];

				const percentage = total ? (skipped / total) * 100 : 0.01;
				return `${skipped} / ${percentage.toFixed(1)}%`;
			}
		}
	}

	private _getStreamStatString(stats: OBSResponseTypes['GetStreamStatus'], name: string, socketIdx: number): string | undefined {
		switch (name) {
			case 'outputActive': {
				return stats['outputReconnecting'] ? 'Reconnecting' : stats['outputActive'] ? 'Active' : 'Inactive';
			}
			case 'outputSkippedFrames': {
				let skipped = stats['outputSkippedFrames'];
				let total = stats['outputTotalFrames'];

				if (total < this._firstTotal[socketIdx] || skipped < this._firstDropped[socketIdx]) {
					this._firstTotal[socketIdx] = total;
					this._firstDropped[socketIdx] = skipped;
				}
				total -= this._firstTotal[socketIdx];
				skipped -= this._firstDropped[socketIdx];

				const percentage = total ? (skipped / total) * 100 : 0.01;
				return `${skipped} / ${percentage.toFixed(1)}%`;
			}
		}
	}

	private _getRecordStatString(stats: OBSResponseTypes['GetRecordStatus'], name: string): string | undefined {
		if (name === 'outputActive') return stats['outputPaused'] ? 'Paused' : stats['outputActive'] ? 'Active' : 'Inactive';
	}
	// --

}