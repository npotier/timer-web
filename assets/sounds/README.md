# Sound files

`js/audio.js` plays one mp3 per sound preset from this folder. None are bundled with the repo
(no binary assets checked in) — drop a royalty-free mp3 in with the exact filename below and it
is picked up automatically; if a file is missing, that preset silently falls back to a plain
synthesized beep (see `audio.js`), so the app still works without any of these.

| Filename | Preset | Suggested source (free, no attribution required) |
|---|---|---|
| `classic.mp3` | Classic | [Mixkit — Positive interface beep](https://mixkit.co/free-sound-effects/beep/) |
| `digital.mp3` | Digital | [Mixkit — Appliance ready beep](https://mixkit.co/free-sound-effects/beep/) |
| `arcade.mp3` | Arcade | [Mixkit — Repeating arcade beep](https://mixkit.co/free-sound-effects/beep/) |
| `boxing.mp3` | Boxing | [Pixabay — "boxing bell" search](https://pixabay.com/sound-effects/search/boxing%20bell/) |
| `zen.mp3` | Zen | [Mixkit — Relaxing bell chime](https://mixkit.co/free-sound-effects/chimes/) |
| `deep.mp3` | Deep | [Mixkit — Knocking sub bass](https://mixkit.co/free-sound-effects/bass/) |
| `chime.mp3` | Chime | [Mixkit — Achievement bell](https://mixkit.co/free-sound-effects/bell/) |
| `retro.mp3` | Retro | [Mixkit — Winning a coin, video game](https://mixkit.co/free-sound-effects/video-game/) |

Each site above offers free, no-signup, no-attribution-required mp3 downloads suitable for use in
an app (Mixkit License / Pixabay Content License) — pick any track you like from the linked
category page, not necessarily the exact one named, and save it under the filename in the table.

A single short clip (under ~1s, ideally) per preset is enough: `audio.js` reuses it across all
phases (Prepare/Exercise/Rest/Cooldown/tick) by pitch-shifting it slightly per phase.
