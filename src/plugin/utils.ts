export class SDUtils {
	/**
	 * Set key title, wrapped in lines of aprox. 9 characters each
	 * @param context Action context
	 * @param title Title to set
	 * @param target HW/SW target
	 */
	static setKeyTitle(context: string, title: string, target = 0) {
		if (!title) return;
		const lines = title.match(/.{1,9}(\s|$)|\S+?(\s|$)/g); // up to 9 characters words
		const joined = lines?.map(l => l.trim()).join('\n');
		if (joined) {
			$SD.setTitle(context, joined, target);
		}
	}

	// Aux object to define console log levels
	static consoleLog = {
		'error': (msg: string) => console.error(msg),
		'warn': (msg: string) => console.warn(msg),
		'info': (msg: string) => console.info(msg),
		'log': (msg: string) => console.log(msg),
	};

	/**
	 * Log message to both console and SD log file
	 * @param message Message to log
	 */
	static log(message: string, logLevel: 'error' | 'warn' | 'info' | 'log' = 'info') {
		message = `[${logLevel.toUpperCase()}]${message.startsWith('[') ? '' : ' '}` + message;
		SDUtils.consoleLog[logLevel](message);
		$SD.logMessage(message);
	}

	/**
	 * Log error message to both console and SD log file
	 * @param message Error message to log
	 */
	static logError(message: string) {
		SDUtils.log(message, 'error');
	}
}

export class ImageUtils {
	/**
	 * Load an image into an Image() element
	 * @param url Image url
	 * @returns Promise that resolves on successful load, and rejects on load error
	 */
	static loadImagePromise(url: string): Promise<HTMLImageElement> {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => resolve(img);
			img.onerror = () => reject();
			img.src = url;
		});
	}
}

export class CanvasUtils {
	static drawColorRect(
		ctx: CanvasRenderingContext2D,
		color: string,
		xStart: number, xEnd: number,
		compOp: GlobalCompositeOperation = 'source-over',
		canvasWidth = 144, canvasHeight = 144,
	) {
		ctx.globalCompositeOperation = compOp;
		ctx.fillStyle = color;
		ctx.fillRect(xStart * canvasWidth, 0, xEnd * canvasWidth, canvasHeight);
	}

	static drawLineHPatternRect(
		ctx: CanvasRenderingContext2D,
		xStart: number, xEnd: number,
		color1 = '#33333366', color2 = '#66666666',
		numLines = 15,
		compOp: GlobalCompositeOperation = 'source-over',
		canvasWidth = 144, canvasHeight = 144,
	) {
		ctx.globalCompositeOperation = compOp;
		const thickness = canvasHeight / numLines;
		for (let i = 0; i < numLines; i++) {
			ctx.beginPath();
			ctx.strokeStyle = i % 2 ? color1 : color2;
			ctx.lineWidth = thickness;
			ctx.moveTo(xStart * canvasWidth, (i + 1 / 2) * thickness);
			ctx.lineTo(xEnd * canvasWidth, (i + 1 / 2) * thickness);
			ctx.stroke();
		}
	}

	static drawLineVPatternRect(ctx: CanvasRenderingContext2D,
		xStart: number, xEnd: number,
		color1 = '#33333366', color2 = '#66666666',
		numLines = 16,
		compOp: GlobalCompositeOperation = 'source-over',
		canvasWidth = 144, canvasHeight = 144,
	) {
		ctx.globalCompositeOperation = compOp;
		const thickness = canvasWidth / numLines;
		numLines = numLines * (xEnd - xStart);
		for (let i = 0; i < numLines; i++) {
			ctx.beginPath();
			ctx.strokeStyle = i % 2 ? color1 : color2;
			ctx.lineWidth = thickness;
			ctx.moveTo(xStart * canvasWidth + (i + 1 / 2) * thickness, 0);
			ctx.lineTo(xStart * canvasWidth + (i + 1 / 2) * thickness, canvasHeight);
			ctx.stroke();
		}
	}
}

export function clamp(val: number, min: number, max: number) {
	return Math.min(Math.max(val, min), max);
}

export function secondsToTimecode(seconds: number): string {
	return [
		seconds / 60 / 60,	// hours
		seconds / 60 % 60,	// minutes
		seconds % 60,		// seconds
	]
	.map(n => Math.floor(n).toString().padStart(2, '0'))
	.join(':');
}

/**
 * Get the bounding box of a certain SVG text string
 * @param text Text string to get bbox
 * @param fontFamily Font family
 * @param fontWeight Font weight
 * @param testSize Font test size. Beware using 1 might lead to inaccurate results
 * @param width SVG parent width
 * @param height SVG parent height
 * @returns Rectangle defining the bounding box
 */
export function getTextBbox(text: string, fontFamily: string, fontWeight: string, testSize = 30, width = 144, height = 144) {
	const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svgEl.setAttribute('width', width.toString());
	svgEl.setAttribute('height', height.toString());

	const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
	textEl.textContent = text;
	textEl.setAttribute('font-size', testSize.toString());
	textEl.setAttribute('font-family', fontFamily);
	textEl.setAttribute('font-weight', fontWeight);

	svgEl.appendChild(textEl);
	const toRemove = document.body.insertAdjacentElement('beforeend', svgEl);
	const textBBox = textEl.getBBox();
	toRemove?.remove();
	return textBBox;
}

export function createVPattern(start = 0, end = 1, width = 144, height = 144, lines = 16) {
	const numLines = lines;
	const lineW = width / numLines;
	const linesToDraw = numLines * (end - start);
	let pattern = '';
	for (let i = 0; i < linesToDraw; i++) {
		pattern += `<rect x="${i * lineW + (width * start)}" y="0" width="${lineW}" height="${height}" fill="${i % 2 ? '#333333' : '#666666'}" fill-opacity="0.4"/>`;
	}
	return pattern;
}