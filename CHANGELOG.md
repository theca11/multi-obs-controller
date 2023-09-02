# CHANGELOG

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2023-09-02

### Added

-   Long key press support
-   Default target global option
-   Custom key images support, by properly setting SD action states
-   Allow hiding target number indicators shown in keys

### Changed

-   Tweaked actions images colors
-   Changed audio mute/unmute action icon

### Fixed

-   Make `Scene Collection` action update with events
-   Show OK/alert feedback with a slight delay to avoid overrides from async events
-   Prevent saving empty setting options
-   Prevent some unneeded key images updates on events

### Removed

-   Plugin connection status action (`OBS WS Servers Status`)

## [0.1.0] - 2023-08-15

First release of Multi OBS Controller StreamDeck plugin. This plugin allows easy remote control of multiple OBS Studio instances in a synchronous way.

You can configure each action to be sent to a specific OBS instance, or to all of them at the same time, with shared or different settings. Currently supports up to 2 OBS Studio instances.

Multi OBS Controller plugin communicates with OBS Studio via OBS Websockets. Requires OBS Studio >= 29.0 (OBS Websockets v5).

Initial set of actions:

-   Toggle stream
-   Toggle record
-   Set current scene
-   Toggle source visibility
-   Set scene collection
-   Toggle audio mute
-   Trigger hotkey by sequence
-   Refresh capture device
-   Advanced raw OBS WS request
-   Advanced raw OBS WS batch request
-   Plugin connection status to OBS

The advanced actions allow to send any request supported by the [OBS Websockets protocol](https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md#requests).

All actions except the last one are supported in multi-actions. Toggle actions have individual on/off choices inside multi-actions.
