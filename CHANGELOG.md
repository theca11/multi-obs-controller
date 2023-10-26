# CHANGELOG

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2023-11-01

### Added

-   New actions:
    -   **Record Pause**: pause currently active recording
    -   **Virtual Camera**: toggle OBS virtual camera output
    -   **Profile**: switch to a specific profile
    -   **Studio Mode**: toggle Studio Mode
    -   **Studio Mode Transition**: trigger a transition between scenes while in Studio Mode
    -   **Screenshot**: take a screenshot of the current OBS output or a specific scene/source
    -   **Refresh Browser Source**: refresh the cache of a browser source page
    -   **Stats**: display OBS general/stream/record stats (CPU usage, memory usage, dropped frames, etc.)
-   Option to show elapsed time in Stream/Record actions
-   Global option to choose position of target indicators shown in keys (top/middle/bottom)

### Changed

-   Some actions now show a transitional state using a different color (eg. stream/record starting/ending, scene collection changing)

### Fixed

-   Automatic title is now set properly when different for each OBS instance
-   Prevent flickering/partial updates of key images
-   Key images updates improved to perform faster and in a more synchronous way
-   Improved responsiveness of Toggle Source Visibility actions
-   Source visibility state now correctly updates after switching to a different scene collection
-   Other handful of improvements and optimizations

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
