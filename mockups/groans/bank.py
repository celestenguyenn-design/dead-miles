# The in-game zombie voice bank, all in the style of prototype #5 "snarl" (the owner's pick): high jitter, period doubling,
# full rasp, hard throat drive. Short snarls (a zombie that spots you) + longer groans (shuffling, searching).
# Rendered into ONE mono sprite (next/sfx/zombie.mp3) with 0.25 s of silence between clips; offsets go into engine.js.
import sys, json, subprocess, numpy as np
sys.argv = ['x']; src = open('/home/user/dead-miles/mockups/groans/growl.py').read().split('clips = {')[0]; exec(src)
S = dict(jit=.2, sub=.3, rasp=1.0, drive=6)
bank = [
 ('snarl', voice(.9,  P((0, 140), (.25, 180), (1, 110)), ['eh', 'ah'], fry_from=.9, seed=5, **S)),            # the original #5
 ('snarl', voice(.8,  P((0, 150), (.2, 195), (1, 120)), ['ah', 'uh'], fry_from=.88, seed=11, **S)),
 ('snarl', voice(1.0, P((0, 130), (.3, 170), (1, 100)), ['eh', 'aw'], fry_from=.85, seed=12, **S)),
 ('snarl', voice(.7,  P((0, 160), (.15, 205), (1, 125)), ['ah', 'eh'], fry_from=.9, seed=13, **S)),
 ('groan', voice(1.4, P((0, 120), (.35, 150), (1, 95)), ['uh', 'ah', 'uh'], fry_from=.8, seed=21, **S)),
 ('groan', voice(1.6, P((0, 110), (.5, 135), (1, 85)), ['aw', 'oh'], fry_from=.75, seed=22, **S)),
 ('groan', voice(1.2, P((0, 125), (.3, 160), (1, 100)), ['ah', 'uh'], fry_from=.82, seed=23, **S)),
 ('groan', voice(1.5, P((0, 105), (.4, 130), (.7, 115), (1, 85)), ['uh', 'aw', 'oh'], fry_from=.78, seed=24, **S)),
 ('groan', voice(1.1, P((0, 135), (.25, 165), (1, 105)), ['eh', 'ah', 'uh'], fry_from=.85, seed=25, **S)),
 ('groan', voice(1.3, P((0, 115), (1, 90)), ['oh', 'uh'], fry_from=.7, seed=26, **S)),
]
SR2 = 22050; gap = np.zeros(int(.25*SR)); parts = [gap]; offs = []; t = len(gap)/SR
for kind, x in bank:
    x = room(np.concatenate([x, np.zeros(int(.15*SR))]), .12); x = .9*x/np.max(np.abs(x))
    offs.append([kind, round(t, 3), round(len(x)/SR, 3)]); parts += [x, gap]; t += (len(x)+len(gap))/SR
y = np.concatenate(parts)
pcm = (y*32767).astype('<i2').tobytes()
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', '-ar', str(SR2), '-b:a', '64k', '/home/user/dm-groan/next/sfx/zombie.mp3'], input=pcm, check=True)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', '-b:a', '128k', '/home/user/dead-miles/mockups/groans/7-snarl-bank.mp3'], input=pcm, check=True)
print(json.dumps(offs))
