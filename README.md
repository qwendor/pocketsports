# Pocket Sports

A Wii Sports style party game for the browser. The game runs on a laptop or TV screen and
everybody plays with their **phone as the motion controller**: swing it like a tennis racket,
a bowling ball, a baseball bat, a golf club, or punch with it.

Five sports: **Tennis, Bowling, Home Run Derby, Golf, Boxing**. 1 to 4 phones. Computer
opponents fill in when you play alone.

## Start a party

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
slots (tennis), `Space` swing/throw, `A`/`D` aim, `J`/`H`/`U` punch and `B` block (boxing).
