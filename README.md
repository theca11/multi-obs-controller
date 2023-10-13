<p align="center">
  <img src="/.github/images/banner.png?sanitize=true" height="100">
</p>

<p align="center">
  <img src="https://img.shields.io/github/package-json/v/theca11/multi-obs-controller/master?label=%20&color=green" />
  <a href="https://marketplace.elgato.com/product/multi-obs-controller-6926228a-2efa-4fb9-849a-3f7d9ad86a9b">
        <img src="https://img.shields.io/badge/Elgato_Marketplace-gray?logo=elgato&logoColor=white&labelColor=1231ac&color=gray" alt="Elgato Marketplace">
  </a>
  <a href="https://discord.gg/sMSDVRQSUd">
        <img src="https://img.shields.io/badge/Discord-gray?logo=discord&logoColor=white&labelColor=6A7EC2&color=gray" alt="Discord Support">
  </a>
  <a href="https://ko-fi.com/the_ca11">
        <img src="https://img.shields.io/badge/Ko--fi-gray?logo=kofi&logoColor=white&labelColor=red&color=gray" alt="Ko-fi donate">
  </a>
</p>

<hr/>

Multi OBS Controller plugin for Elgato Stream Deck allows you to remotely control multiple OBS Studio instances at the same time in an easy way. You can keep them synchronized or manage them individually, it's all up to you! It's ideal for double OBS setups (one instance for streaming, one instance for recording) that you need to control simultaneously.

Requires OBS Studio v29.0 or later (which supports OBS Websockets v5 protocol).

## Table of Contents

-   [Installation](#installation)
-   [General Configuration](#general-configuration)
    -   [OBS Studio instances configuration](#obs-studio-instances-configuration)
    -   [Additional general plugin settings](#additional-general-plugin-settings)
-   [Action Configuration](#action-configuration)
    -   [Common settings](#common-settings)
    -   [Action-specific settings](#action-specific-settings)
-   [Key status and feedback](#key-status-and-feedback)
-   [Advanced OBS WS raw actions](#advanced-obs-ws-raw-actions)
-   [FAQ](#faq)

## Installation

### Installation from Elgato Marketplace (recommended)

Go to the [Elgato Marketplace plugin page](https://marketplace.elgato.com/product/multi-obs-controller-6926228a-2efa-4fb9-849a-3f7d9ad86a9b) and click the `Get` button to download and install.

### Installation from Github release

Go to the [releases page](https://github.com/theca11/multi-obs-controller/releases) and choose your desired version. In the `Assets` section at the end of the release post you will find a file `Multi-OBS-Controller-Plugin-v#.#.#.streamDeckPlugin`. Download it and double-click it to make Stream Deck prompt for installation confirmation.

Alternatively, you can download the zipped build folder also found in the release `Assets` (`Multi-OBS-Controller-Plugin-v#.#.#.zip`), extract it, and copy/paste the folder `dev.theca11.multiobs.streamDeckPlugin` to the corresponding Stream Deck Plugins directory (for Windows located at `%APPDATA%\Elgato\StreamDeck\Plugins`).

> Official Elgato docs on installing/uninstalling plugins [here](https://help.elgato.com/hc/en-us/articles/11434818801293-Elgato-Stream-Deck-How-to-Install-and-Uninstall-Stream-Deck-Plugins-).

## General Configuration

The plugin has some general configuration settings that are applied globally to all actions (you only need to set them once). To open the general configuration window, add any of the plugin actions to your Stream Deck, and click the link at the end of the settings section.

### OBS Studio instances configuration

The plugin communicates with OBS instances via OBS Websockets. To configure the Websockets Server for each instance of OBS Studio:

1. Open OBS Studio and go to Tools > Websocket Server Settings
2. Check "Enable Websocket Server"
3. Configure the Server Port and Server Password
4. Apply and close the settings window

Once the Websocket Servers are ready, add the settings to the plugin general configuration form.

### Additional general plugin settings

-   `Default target`: the OBS Instance(s) that will be by default the target of new actions.
-   `Long press length`: the default length, in milliseconds, of long key presses. You can override this value at the action level.
-   `Don't show visual OK/alert feedback after pressing a key`: hide the checkmark/warning triangle overlays that are shown after pressing a key.
-   `Don't show target number indicators in keys`: hide the `1`/`2` target indicators shown in keys.

## Action configuration

### Common settings

Each action defines which OBS instance(s) to target. You can send the action to a single specific OBS instace, or send it to all configured OBS instances. If you choose the latter, you can also decide whether to send the same action-specific settings to every instance or to send different settings to each instance.

For example, you could configure a `Scene` action to do any of the following:

-   Set scene A only in OBS#1
-   Set scene A only in OBS#2
-   Set scene A in both OBS#1 and OBS#2
-   Set scene A in OBS#1 while setting scene B in OBS#2

### Action-specific settings

Depending on the action, specific settings are required. For example, you need to provide the scene name to change the current scene. Remember you can use the same or different settings for each OBS instance depending on your needs.

## Key status and feedback

The plugin notifies the status and success/error of an action via key images color codes and feedback icons after pressing a key.

For actions that are associated with a particular on or off state (e.g. stream, record, currrent scene), the key image is colored to live show such state in every target OBS instance of the action. That is, if the target is a single OBS instance, the key image will either have a bright background color (on) or a dark one (off), in the same style as any other Stream Deck plugin action with states. Otherwise, if the target is multiple the key image will be vertically divided in sections corresponding to each OBS instance. These sections will follow the same color-code as before: bright for on state, dark for off state. This way it can be easily checked that all instances are in the expected states. There is a third color-code for the state, shown as a pattern of gray vertical lines, that indicates that the corresponding OBS instance is disconnected, or in some cases that the action settings are invalid.

For actions without states (e.g. trigger hotkey, raw/raw batch requests), the key image isn't updated. However, after successfully triggering an action by pressing the key, a checkmark icon overlay will be shown.

For all actions, if the action fails or success only partially, an alert triangle will be shown after pressing the key. Take into account that such alert will appear if:

-   The action is sent to a single OBS instance and it fails.
-   The action is sent to multiple OBS instances but the WS server of one of them is not connected/reachable. The action may have succeeded in other instances.
-   The action is sent to multiple OBS instances but failed in one of them. The action may have succeeded in other instances.

If you decide to substitute the default action images with custom ones, be aware that the action will only be set to on when it is on in every target instance of the action. That means that if for some reason one of the targets is disconnected, or the state in it is off, the internal Stream Deck state will be off and so will be your custom image choice.

## Advanced OBS WS raw actions

There are two advanced actions meant for complex use cases and experienced users. These actions, `Raw WS Request` and `Raw WS Batch Request`, allow you to send any payload compatible with the [OBS Websockets specification](https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md).

For `Raw WS Request`, fill the `Request Type` field with a string and the `Request Data` field with a valid JSON object. Example:

```
Request Type: SetCurrentProgramScene
Request Data: {"sceneName": "my scene"}
```

For `Raw WS Batch Request`, fill the `Requests Array` field with a valid array of requests objects. Example:

```
[
  {
    "requestType": "SetCurrentSceneTransition",
    "requestData": {"transitionName": "Fade"}
  },
  {
    "requestType": "Sleep",
    "requestData": {"sleepMillis": 100}
  },
  {
    "requestType": "TriggerStudioModeTransition"
  }
]
```

Additionally, you can configure the batch execution type and halt on failure options.

## FAQ

**> How can I report an issue, make a feature request or get general help?**

Use [Github](https://github.com/theca11/multi-obs-controller/issues) for unexpected issues and feature requests, or join the [Discord server](https://discord.gg/sMSDVRQSUd) to ask general questions and get help.

**> Will you add _insert here what you need_ action to the plugin?**

The plugin is still in development and right now it only contains a subset of actions of all possible ones within OBS Studio. Other actions may arrive as time goes by, but if you're missing something in particular let me know via Discord or Github issues.

**> I want to do something with OBS but the plugin doesn't have a dedicated action for it. What can I do?**

The plugin has 2 advanced actions (`Raw Request` and `Raw Batch Request`) that allow you to send to OBS any request support by the [OBS Websockets protocol](https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md). This means that even if the plugin doesn't seem to support what you want at first sight, it most probably can still do it! If you're unfamiliar with the Websockets protocol or it's just too complex for you, ask for help in the Discord server. Also, remember that the plugin is still growing, so if your use case is common enough a dedicated action might be added for it in next releases, so share your requests.

**> I'm using your plugin and I love it! How can I show appreciation?**

You can rate the plugin in the [Stream Deck store](https://apps.elgato.com/plugins/dev.theca11.multiobs) and stop by Discord to share your love. If you want to support the project financially, you can [buy me a coffee](https://ko-fi.com/the_ca11).

---

_Multi OBS Controller plugin is not affiliated, associated, authorized, endorsed by, or in any way officially connected with the [OBS Project](https://obsproject.com/). All product, company names and logos are trademarks™ or registered® trademarks of their respective owners._
