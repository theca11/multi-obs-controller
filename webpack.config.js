const TerserPlugin = require('terser-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const LicenseWebpackPlugin = require('license-webpack-plugin').LicenseWebpackPlugin;

module.exports = {
	context: __dirname,
	entry: {
		app: './src/plugin/app.ts',
	},
	resolve: {
		extensions: ['.ts', '.js'],
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
		],
	},
	target: 'web',
	output: {
		filename: 'plugin/[name].js',
		path: __dirname + '/build/dev.theca11.multiobs.sdPlugin',
		clean: true,
	},
	optimization: {
		concatenateModules: false,
		minimizer: [
			new TerserPlugin({
				test: /app\.js(\?.*)?$/i,
				terserOptions: {
					ecma: 2020,
					mangle: false,
					keep_classnames: true,
					keep_fnames: true,
					module: false,
				},
			}),
		],
	},
	plugins: [
		new CopyPlugin({
			patterns: [
				{
					from: 'src',
					globOptions: {
						ignore: ['**/*.ts', '**/.*'],
					},
				},
				'CHANGELOG.md',
				'LICENSE',
				'README.md',
			],
		}),
		new LicenseWebpackPlugin({
			outputFilename: '3rdparty-licenses.txt',
			renderLicenses: (modules) =>
				modules
					.map(
						(module) =>
							`${module.packageJson.name} (v${module.packageJson.version}) - ${module.licenseId}\n${module.licenseText}`,
					)
					.join('\n\n-------------------------\n\n'),
		}),
	],
	watchOptions: {
		ignored: /node_modules/,
	},
};
