# Pocket Sports

A Wii Sports style party game for the browser. The game runs on a laptop or TV screen and
everybody plays with their **phone as the motion controller**: swing it like a tennis racket,
a bowling ball, a baseball bat, a golf club, or punch with it.

Twelve modes: **Tennis, Ping Pong, Volleyball, Bowling, Home Run Derby, Golf, Swordplay, 3-Point Contest, Tanks, Beat Shake, Dance Off, Fruit Slice**, plus a Controller Lab. 1 to 4 phones. Computer
opponents fill in when you play alone.

## Play online (easiest)

The game is live at **https://qwendor.github.io/pocketsports/**. Open it on the laptop or TV,
click HOST A GAME, and phones scan the QR code (or open the same address and type the room code).
No setup, no certificate warning, and phones can be on any network. To update the live site after
editing: `python build.py`, then `git add -A && git commit -m "..." && git push`.

## Start a party on your own Wi-Fi (offline option)

1. Double-click `serve.py` (or run `python serve.py`). It prints something like
   `https://10.0.0.21:4235/`.
2. Open that https address on the laptop/TV browser and click **HOST A GAME**.
3. Everyone scans the QR code with their phone camera (same Wi-Fi as the laptop).
   The phone shows a warning that the certificate is not trusted, because the server uses a
   self-signed certificate. Tap **Advanced / Show details -> Proceed / Visit this website**.
   This happens once per phone.
4. Type a name, tap **JOIN**. iPhones ask for permission to use motion sensors: tap **Allow**.
5. Player 1's phone (or the laptop keyboard) picks a sport. Everybody follows the hints on their
   phone screen.

Hold the phone like a Wii remote and swing with your whole arm. If a phone has no motion
sensors (or you are testing on a laptop), the controller switches to **touch mode**: swipe on the
pad to swing.

## Why https and the certificate warning

Phone browsers only expose motion sensors to secure (https) pages. `serve.py` serves the game over
https on port 4235 using the self-signed `cert.pem` / `key.pem` in this folder. Plain http is
also served on port 4236 for the laptop itself.

If phones cannot open the page at all, Windows Firewall is probably blocking Python. Allow it once
(PowerShell as administrator):

```powershell
netsh advfirewall firewall add rule name="Pocket Sports" dir=in action=allow protocol=TCP localport=4235,4236
```

To avoid the certificate warning entirely, host `index.html` on any https site (for example GitHub
Pages, like the other games). Then phones on any network can join, and the metered.ca TURN relay
already configured in the file relays the connection when needed.


## Motion controller (how the phone is tracked)

The phone is a tracked controller, not a swing button. `MotionInput` on the phone turns the
orientation sensors into a quaternion (gimbal-lock free), removes the heading measured at
CALIBRATE so "forward" is wherever the phone pointed at the TV, and adds angular velocity, linear
acceleration and a bounded velocity/position estimate. It sends a compact packet 30 times a second.
The host (`RemoteCtrl`) dead-reckons with the angular velocity for the time the packet spent in
flight and applies adaptive smoothing (heavy when still, light when moving). Every sport reads the
same object: `ctrl.q`, `ctrl.axis()` (where the phone points), `ctrl.normal()` (screen normal),
`ctrl.w`, `ctrl.a`, `ctrl.v`, `ctrl.pos`, `ctrl.stationary`, `ctrl.quality`.

- Real tracking: rotation, angular velocity, acceleration.
- Estimated: velocity and position (integrated acceleration with decay, zero-velocity updates when
  the phone is still, and a spring back to neutral, capped to a 0.6 m volume). Phones cannot do
  true positional tracking; this gives believable short pushes and pulls, not room-scale tracking.
- Standard grip: portrait, top edge pointing at the TV, screen up (like a TV remote). Roll the
  phone 90 degrees to hold it like a racket handle.
- All tuning lives in `MOTION_CFG` in `parts/02_core.js`; per-sport numbers in `TENNIS_P`/`PINGPONG_P`, `VB_CFG`,
  `BOWL_CFG`, `GOLF_CFG`, `BASE_CFG`, `BOX_CFG`, `BB_CFG`.
- **Controller Lab** (last tile in the sport menu) shows a 3D phone and racket that follow each
  connected phone, with pitch/yaw/roll, quaternion, rates, latency, stationary and quality readouts,
  and CALIBRATE / RECENTER / RESET POSITION buttons on the phone.
- Phones without sensors (or desktops) fall back to touch mode: drag on the pad to aim the
  controller, flick to swing.

## Files

- `index.html` - the whole game (TV screen + phone controller in one file). Built from `parts/`.
- `parts/` - source pieces; run `python build.py` after editing to rebuild `index.html`,
  syntax-check it and copy it to the Desktop as `PocketSports.html`.
- `serve.py` - local https/http server. `cert.pem`, `key.pem` - self-signed certificate.
- `check.js` - syntax check used by `build.py`.

## Controls on the laptop (host)

Enter / Esc / arrow keys move through the menus. Esc during a game returns to the sport menu.

## Testing without phones

Open `http://localhost:4236/?test&host` and use the `game` object in the console:
`game.addFake('Bot')`, `game.start('tennis')`, `game.swing(0, 1.2)`, `game.btn(0,'hold',1)`,
`game.orient(0, 0, 15)`, `game.step(60)`, `game.state()`. Keys in test mode: `1`-`4` swing for
slots (tennis), `Space` swing/throw, `A`/`D` aim, `Space` also swings in Volleyball.
