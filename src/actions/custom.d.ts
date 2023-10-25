// https://webpack.js.org/guides/asset-modules/#source-assets
// https://webpack.js.org/guides/typescript/#importing-other-assets
declare module '*.svg' {
	const content: string;
	export default content;
}