# Orpheus-s-Lyre

This interactive p5.js project is inspired by the myth of Orpheus's Lyre, whose seven-stringed lyre could move trees and stones. The work shifts that transformation toward a more human condition: the desire for a response.

## p5.js Web Editor

Live sketch you can try:

`https://editor.p5js.org/Kuhy/full/YBZJcYddv`

## Arduino Code

`Arduino Code`

## Arduino dependencies

This Arduino sketch uses:

- `Wire.h` (built-in Arduino library)
- `Adafruit_MPR121.h` from the `Adafruit MPR121` library

The servo-related code has been removed.  
The sketch only reads touch input from the MPR121 and sends note values `0` to `6` through Serial.

## Files kept in this repository

- `index.html`
- `style.css`
- `sketch.js`
- `1.mp3` to `7.mp3`

`index.html` uses CDN links for `p5.js` and `p5.sound`, so the repository only keeps the sketch files and audio assets.
