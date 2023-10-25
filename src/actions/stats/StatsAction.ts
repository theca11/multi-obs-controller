import { OBSResponseTypes } from 'obs-websocket-js';
import { sockets } from '../../plugin/sockets';
import { getTextBbox } from '../../plugin/utils';
import { AbstractStatelessAction } from '../BaseWsAction';
import { ContextData, SocketSettings } from '../types';

type ActionSettings = { stats: string[], colors: string[] }
type StatConfig = { target: number, stat: string, color: string }

export class StatsAction extends AbstractStatelessAction<ActionSettings> {

	private _ctxStatsSettings = new Map<string, StatConfig[]>();
	private first_encoded = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
	private first_skipped = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
	private first_rendered = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
	private first_lagged = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
	private first_total = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
	private first_dropped = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);

	private _statsUpdateInterval: NodeJS.Timeout | null = null;

	_generalStats = new Array(sockets.length).fill(null);
	_streamStats = new Array(sockets.length).fill(null);
	_recordStats = new Array(sockets.length).fill(null);

	constructor() {
		super('dev.theca11.multiobs.stats', { hideTargetIndicators: true });

		this.onLongPress(() => {
			this.resetStats();
		});
	}

	override async onContextAppear(context: string, contextData: ContextData<ActionSettings>): Promise<void> {
		this._ctxStatsSettings.set(context, this.formatStatSettings(contextData.settings));
		if (this._ctxStatsSettings.size === 1 && !this._statsUpdateInterval) {
			await this.fetchStats();
			this._statsUpdateInterval = setInterval(async () => {
				await this.fetchStats();
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
		this._ctxStatsSettings.set(context, this.formatStatSettings(contextData.settings));
	}

	resetStats() {
		// Reset stats from skipped/dropped frames
		this.first_encoded = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
		this.first_skipped = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
		this.first_rendered = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
		this.first_lagged = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
		this.first_total = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
		this.first_dropped = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
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
			const text = this.getStatString(target - 1, stat) || '---';

			// Adjust font size and y-position dynamically
			const fontFamily = 'Arial';
			const fontWeight = '800';
			const testSize = 30;
			const textBBox = getTextBbox(text, fontFamily, fontWeight, testSize, width, height);
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

	formatStatSettings(settingsArray: (SocketSettings<ActionSettings> | null)[]): StatConfig[] {
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

	// to-do: I should optimize this a bit, add some extra checks when things are disconnected and so on
	getStatString(socketIdx: number, statName: string): string {
		const [group, name] = statName.split('.');
		if (group === 'general') {
			const groupStats = this._generalStats[socketIdx];
			if (!groupStats) return '';
			if (name === 'cpuUsage') return groupStats[name].toFixed(1) + '%';
			if (name === 'memoryUsage') return (groupStats[name] * 1024 * 1024 / 1024.01 / 1024.01).toFixed(1) + ' MB';
			if (name === 'availableDiskSpace') {
				const bytes = groupStats[name] * 1024 * 1024;
				if (bytes > 1024 * 1024 * 1024 * 1024) return (bytes / 1024.01 / 1024.01 / 1024.01 / 1024.01).toFixed(1) + ' TB';
				if (bytes > 1024 * 1024 * 1024) return (bytes / 1024.01 / 1024.01 / 1024.01).toFixed(1) + ' GB';
				else return (bytes / 1024.01 / 1024.01).toFixed(1) + ' MB';
			}
			if (name === 'activeFps') return groupStats[name].toFixed(0) + ' FPS';
			if (name === 'averageFrameRenderTime') return groupStats[name].toFixed(1) + ' ms';
			if (name === 'renderSkippedFrames') {
				let skipped = groupStats['renderSkippedFrames'];
				let total = groupStats['renderTotalFrames'];

				if (total < this.first_rendered[socketIdx] || skipped < this.first_lagged[socketIdx]) {
					this.first_rendered[socketIdx] = total;
					this.first_lagged[socketIdx] = skipped;
				}
				total -= this.first_rendered[socketIdx];
				skipped -= this.first_lagged[socketIdx];

				const percentage = total ? (skipped / total) * 100 : 0.01;
				return `${skipped} / ${percentage.toFixed(1)}%`;
			}
			if (name === 'outputSkippedFrames') {
				let skipped = groupStats['outputSkippedFrames'];
				let total = groupStats['outputTotalFrames'];

				if (total < this.first_encoded[socketIdx] || skipped < this.first_skipped[socketIdx]) {
					this.first_encoded[socketIdx] = total;
					this.first_skipped[socketIdx] = skipped;
				}
				total -= this.first_encoded[socketIdx];
				skipped -= this.first_skipped[socketIdx];

				const percentage = total ? (skipped / total) * 100 : 0.01;
				return `${skipped} / ${percentage.toFixed(1)}%`;
			}
		}
		else if (group === 'stream') {
			const groupStats = this._streamStats[socketIdx];
			if (!groupStats) return '';
			if (name === 'outputActive') return groupStats['outputReconnecting'] ? 'Reconnecting' : groupStats['outputActive'] ? 'Active' : 'Inactive';
			if (name === 'outputSkippedFrames') {
				let skipped = groupStats['outputSkippedFrames'];
				let total = groupStats['outputTotalFrames'];

				if (total < this.first_total[socketIdx] || skipped < this.first_dropped[socketIdx]) {
					this.first_total[socketIdx] = total;
					this.first_dropped[socketIdx] = skipped;
				}
				total -= this.first_total[socketIdx];
				skipped -= this.first_dropped[socketIdx];

				const percentage = total ? (skipped / total) * 100 : 0.01;
				return `${skipped} / ${percentage.toFixed(1)}%`;
			}
		}
		else if (group === 'record') {
			const groupStats = this._recordStats[socketIdx];
			if (!groupStats) return '';
			if (name === 'outputActive') return groupStats['outputPaused'] ? 'Paused' : groupStats['outputActive'] ? 'Active' : 'Inactive';
		}
		return '';
	}

	async fetchStats() {
		const batchResults = await Promise.allSettled(sockets.map(s =>
			s.isConnected
				? s.callBatch([
					{ requestType: 'GetStats' },
					{ requestType: 'GetStreamStatus' },
					{ requestType: 'GetRecordStatus' },
				])
				: Promise.reject(),
		));
		const responsesData = batchResults.map((res) => {
			if (res.status === 'fulfilled') {
				return res.value.map((r) => r.requestStatus.result === true ? r.responseData : null);
			}
			return null;
		});

		responsesData.forEach((responses, socketIdx) => {
			if (!responses) {
				this._generalStats[socketIdx] = null;
				this._streamStats[socketIdx] = null;
				this._recordStats[socketIdx] = null;
			}
			else {
				responses.forEach((response, i) => {
					if (i === 0) this._generalStats[socketIdx] = (response as OBSResponseTypes['GetStats']) ?? null;
					else if (i === 1) this._streamStats[socketIdx] = (response as OBSResponseTypes['GetStreamStatus']) ?? null;
					else if (i === 2) this._recordStats[socketIdx] = (response as OBSResponseTypes['GetRecordStatus']) ?? null;
				});
			}
		});
	}
}