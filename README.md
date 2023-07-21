# Multi OBS Controller - StreamDeck plugin

Multi OBS Controller plugin allows you to remotely control multiple OBS Studio instances in an easily synchronous way.

## Installation
To install the plugin, simply double click on the file `dev.theca11.multiobs.streamDeckPlugin` (located in the `dist` folder). This will make Stream Deck prompt a window to confirm installation.

Alternatively, you can manually copy and paste the folder `dev.theca11.multiobs.sdPlugin` (located in the `src` folder) in the Stream Deck Plugins directories (for Windows, located at %APPDATA%\Roaming\Elgato\StreamDeck\Plugins).

> Official docs on installing/uninstalling plugins [here](https://help.elgato.com/hc/en-us/articles/11434818801293-Elgato-Stream-Deck-How-to-Install-and-Uninstall-Stream-Deck-Plugins-).

## General Configuration
Multi OBS Controller plugin communicates with OBS instances via OBS Websockets. To configure the Websockets Server for each instance of OBS Studio:

1. Open OBS Studio and go to Tools > Websocket Server Settings
2. Check "Enable Websocket Server"
3. Configure the Server Port and Server Password
4. Apply and close the settings window

Once the Websocket Servers are ready, you need to add the settings to the plugin's general configuration. To do that, add any of the plugin's actions to your Stream Deck, and you will see a link in the settings section. Clicking on it will open a new window you should fill.

> Note: this general configuration applies globally to all actions, so you only need to do this step once!

## Action configuration

### Common settings
Each action defines which OBS instance(s) to target. You can send the action to a single specific OBS instace, or send it to all configured OBS instances. If you choose the latter, you can also decide whether to send the same action-specific settings to every instance or to send different settings to each instance.

### Action-specific settings
Depending on the action, specific settings are required. For example, for setting the current scene you need to provide the scene name. Remember to can use the same or different settings for each OBS instance.

## Visual feedback after pressing a key
After triggering an action by pressing a Stream Deck key, some visual feedback wil be shown to indicate whether the action was successful. A checkmark indicator will be shown if the action was a 100% successful, and an alert triangle will be shown otherwise. Therefore, take into account that an alert will appear if:

- The action is sent to a single OBS instance and it fails.
- The action is sent to multiple OBS instances but the WS server of one of them is not connected/reachable. The action may have succeeded in other instances.
- The action is sent to multiple OBS instances but failed in one of them. The action may have succeeded in other instances.

This is the only feedback that the plugin provides currently. The actions' key images/title do not dynamically update depending on the statuses.

> Note: you can disable the visual feedback on the plugin's general configuration.

## Special actions
### OBS WS Servers Status Action
The plugin contains an special action that shows the current connection status to the different configured OBS Websocket servers. You can use it to track the status or debug possible problems/errors.

### Advanced OBS WS raw actions
There are two advanced actions meant for complicated use cases and experienced users. These actions, `Raw WS Request` and `Raw WS Batch Request`, allow you to send any payload compatible with the [OBS Websockets specification](https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md).

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