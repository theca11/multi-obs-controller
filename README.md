<p align="center">
  <img src="/.github/images/banner.png?sanitize=true" height="100" />
</p>

<p align="center">
  <img src="https://img.shields.io/github/package-json/v/theca11/multi-obs-controller/master?label=%20&color=darkblue" />
  <a href="https://marketplace.elgato.com/product/multi-obs-controller-6926228a-2efa-4fb9-849a-3f7d9ad86a9b"><img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fmp-gateway.elgato.com%2Fproducts%3Fname%3DMulti%2520OBS%2520Controller&query=%24.results%5B0%5D.download_count&prefix=Elgato%20Marketplace%20%7C%20&suffix=%20downloads&logo=elgato&logoColor=white&label=%20&labelColor=1231ac&color=gray" alt="Elgato Marketplace" /></a>
  <a href="https://discord.gg/sMSDVRQSUd"><img src="https://img.shields.io/badge/Discord-gray?logo=discord&logoColor=white&labelColor=6A7EC2&color=gray" alt="Discord Support" /></a>
  <a href="https://ko-fi.com/the_ca11"><img src="https://img.shields.io/badge/Ko--fi-gray?logo=kofi&logoColor=white&labelColor=red&color=gray" alt="Ko-fi donate" /></a>
</p>

<hr/>

Multi OBS Controller plugin for Elgato Stream Deck allows you to remotely control one or multiple OBS Studio instances at the same time in an easy way. You can keep them synchronized or manage them individually, it's all up to you! It's ideal for double OBS setups (one instance for streaming, one instance for recording) that you need to control simultaneously.

Requires OBS Studio v29.0 or later (which supports OBS Websockets v5 protocol).

## Plugin Documentation

Visit the [plugin's website](https://theca11.github.io/multi-obs-controller) for information regarding installation, configuration and usage with Stream Deck.

## Issues and Questions

You can use [Github](https://github.com/theca11/multi-obs-controller/issues) for unexpected issues and feature requests, or join the [Discord server](https://discord.gg/sMSDVRQSUd) to ask general questions and get help.

## Contributing

If you want to support the development of the plugin you can [buy me a coffee](https://ko-fi.com/the_ca11).

PRs are welcomed, but expose your idea before implementing it to ensure it's in line with the plugin vision/goal and you won't waste your time.

### Using sources and building plugin

#### Developing

`npm run prepare-dev` to prepare your dev environment (symlink to Stream Deck plugins folder)

`npm run dev` to start watching files and hot-reload plugin output

#### Building

`npm run build` to build plugin folder, ready to paste into Stream Deck plugins folder

`npm run package` to generate installable package (`.streamDeckPlugin`)

---

_Multi OBS Controller plugin is not affiliated, associated, authorized, endorsed by, or in any way officially connected with the [OBS Project](https://obsproject.com/). All product, company names and logos are trademarks™ or registered® trademarks of their respective owners._
