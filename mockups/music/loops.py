# Dead Miles (next) 0.20 - the area tracks re-rendered as SEAMLESS LOOPS for the game (next/music/*.mp3).
# Same instruments and material as synth.py / xmas.py (the versions the owner approved), changed only so the end runs
# straight back into the start:
#  - every loop is a whole number of bars, and every pattern cycle divides it;
#  - no intro build-ups and no fade-out; held layers (pads, drones, wind, crackle) are rendered a little long and
#    their overhang is equal-power crossfaded onto the start; slow LFOs / wow use a whole number of cycles per loop;
#  - the reverb tail (and any note ringing past the end) is WRAPPED onto the start (circular reverb), so the loop point
#    sounds like the middle of the track;
#  - the file holds [last PAD s of the loop][the loop][first PAD s] so the game can set loopStart/loopEnd = PAD, PAD+L
#    and stay seamless whatever start delay / padding the phone's MP3 decoder adds (anything under PAD).
# Mono 22.05 kHz MP3 at 64 kbps (the synth runs at 22.05 kHz; the game adds a little stereo width itself).
# Run: python3 mockups/music/loops.py   -> next/music/*.mp3 and prints the loop table for music.js
# Frost on the Glass was rejected and is not rendered.
import numpy as np, subprocess, os, json
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'synth.py')).read().split('# 1. Lantern Hollow')[0]
exec(src)   # SR, rng, t_, env, hz, osc, lp, hp, Track, bell, pad, kick, noiseh, heart, clank, piano, PHRY, scale (save is replaced below)
OUT = os.path.join(HERE, '..', '..', 'next', 'music')
PAD = .3         # pre/post roll in seconds
XF = 2.0         # crossfade for held layers
TAIL = 7.0       # room for ringing notes + reverb before wrapping

class Loop:
    def __init__(s, L):
        s.n = int(round(L * SR)); s.L = s.n / SR
        s.buf = np.zeros(s.n + int(TAIL * SR))
    def add(s, t0, sig, g=1):
        i = int(round(t0 * SR)) % s.n
        k = min(len(sig), len(s.buf) - i); s.buf[i:i + k] += sig[:k] * g
        if k < len(sig): s.add_wrap(sig[k:] * g)   # never happens with TAIL, safety
    def add_wrap(s, x):
        s.buf[:len(x)] += x
    def hold(s, y, g=1):
        """a held layer rendered for L + XF seconds: crossfade its overhang onto the start"""
        n, f = s.n, int(XF * SR); y = np.asarray(y, float)[:n + f]
        out = y[:n].copy(); w = np.linspace(0, np.pi / 2, f)
        out[:f] = y[:f] * np.sin(w) + y[n:n + f] * np.cos(w)
        s.buf[:n] += out * g
    def dur(s): return s.L + XF   # how long a held layer must be

def creverb(x, n, dec=3.0, mix=.32):
    """reverb as in synth.py, then wrap everything past the loop end onto the start"""
    m = int(dec * SR); ir = rng.standard_normal(m) * np.exp(-np.linspace(0, 7, m)); ir = lp(ir, 4000); ir /= np.abs(ir).sum() / 12
    Lc = len(x) + m; w = np.fft.irfft(np.fft.rfft(x, Lc) * np.fft.rfft(ir, Lc), Lc)
    y = np.zeros(Lc); y[:len(x)] = x * (1 - mix); y += w * mix
    out = y[:n].copy(); r = y[n:]
    while len(r): k = min(n, len(r)); out[:k] += r[:k]; r = r[k:]
    return out

TABLE = {}
def save(lp_, name, title, post=None):
    x = creverb(lp_.buf, lp_.n)
    if post: x = post(x)
    x = x - x.mean()
    x = x / np.max(np.abs(x)) * .89
    rms = float(np.sqrt(np.mean(x ** 2)))
    p = int(PAD * SR); full = np.concatenate([x[-p:], x, x[:p]])
    pcm = (np.clip(full, -1, 1) * 32767).astype('<i2').tobytes()
    os.makedirs(OUT, exist_ok=True); out = os.path.join(OUT, name + '.mp3')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', '-metadata', f'title={title}',
                    '-metadata', 'artist=Dead Miles', '-codec:a', 'libmp3lame', '-b:a', '64k', out], input=pcm, check=True)
    TABLE[name] = dict(L=lp_.n / SR, n=lp_.n, rms=round(rms, 4), kb=round(os.path.getsize(out) / 1024))
    print(f'{name:18s} {lp_.n / SR:7.3f}s rms {rms:.3f} {os.path.getsize(out) / 1024:.0f} KB')

def holdpad(ms, d, kind, cut):   # pad() without its attack / release
    x = sum(osc(kind, hz(m), d, dt) for m in ms for dt in (-.004, .004)) / (2 * len(ms)); return lp(x, cut)

# 1. Lantern Hollow - out-of-tune music-box lullaby (home). 64 beats at 72 bpm = 53.3 s (the 16-note tune x4)
def t1():
    b = 60 / 72; lo = Loop(64 * b); D = lo.dur()
    lo.hold(holdpad([45, 52, 57], D, 'tri', 500), .35)
    mel = [7, 6, 4, 3, 4, 6, 7, 9, 7, 6, 4, 3, 1, 0, 1, 3]
    for i in range(64):
        s = mel[i % 16]; lo.add(i * b + abs(rng.normal(0, .012)), bell(scale(69, [s])[0] + (-12 if i % 16 > 11 else 0), 3, 1.2), .45)
        if i % 4 == 0: lo.add(i * b, bell(57 + [0, 3, -2, -5][(i // 4) % 4], 4, .6), .25)
    save(lo, 'lantern-hollow', 'Lantern Hollow')

# 2. Rust & Hum - dark drone, wind, far-off metal (the map). 7 bells 7.5 s apart = 52.5 s
def t2():
    lo = Loop(52.5); D = lo.dur(); L = lo.L; tt = t_(D)
    dr = osc('saw', hz(33), D, 0) + osc('saw', hz(33), D, .006) + .6 * osc('saw', hz(40), D, -.004)
    lfo = .5 + .5 * np.sin(2 * np.pi * tt * (4 / L)); lo.hold(lp(dr, 260) * (.6 + .4 * lfo), .4)
    wind = lp(hp(rng.standard_normal(len(tt)), 300), 900) * (.4 + .6 * np.sin(2 * np.pi * tt * (2.5 / L)) ** 2); lo.hold(wind, .12)
    for t0 in rng.uniform(0, L, 9): lo.add(t0, clank(2.5) * rng.uniform(.3, .8), .25)
    for i in range(7): lo.add(3 + i * 7.5, bell(scale(57, [[0, 1, 3, 1, 0, -2, 1][i]])[0], 5, .4), .3)
    save(lo, 'rust-and-hum', 'Rust & Hum')

# 3. Brownstone Pulse - bass pulse + heartbeat (looting). 80 beats at 96 bpm = 50 s (bass 8-beat cycle, bells 32... see below)
def t3():
    b = 60 / 96; lo = Loop(80 * b); D = lo.dur()
    lo.hold(holdpad([40, 47, 52], D, 'saw', 600), .2)
    bass = [40, 40, 41, 40, 40, 40, 43, 41]
    for i in range(160):
        m = bass[(i // 2) % 8]; x = lp(osc('saw', hz(m - 12), b / 2 * .9), 400 + 300 * ((i % 8) / 8)) * env(int(b / 2 * .9 * SR), .005, .08, .4, .08); lo.add(i * b / 2, x, .5)
    for i in range(80):
        if i % 2 == 0: lo.add(i * b, heart(), .6); lo.add(i * b + .18, heart(), .4)
        if i % 4 == 3: lo.add(i * b + b / 2, noiseh(.06), .25)
    mel = [4, 3, 1, 0, 1, 3, 4, 6, 4, 3, 1, 0, 1, 3, 1, -1, 0, 1, 3, 4]   # one bell every 4 beats: 20 per loop
    for i in range(20): lo.add(i * 4 * b, bell(scale(64, [mel[i]])[0], 2.5), .3)
    save(lo, 'brownstone-pulse', 'Brownstone Pulse')

# 4. Last Light Radio - lo-fi detuned piano + crackle (base). 48 beats at 64 bpm = 45 s (3 x the 4-chord cycle)
def t4():
    b = 60 / 64; lo = Loop(48 * b); D = lo.dur(); L = lo.L
    chords = [[45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59], [40, 47, 52, 56]]
    for i in range(12):
        c = chords[i % 4]
        for j, m in enumerate(c): lo.add(i * b * 4 + j * .06, piano(m, 4), .35)
        for k, m in enumerate([c[-1] + 12, c[-2] + 12, c[-1] + 12 + (2 if i % 2 else -1)]): lo.add(i * b * 4 + b * (1.5 + k), piano(m, 1.8), .25)
    n = int(D * SR); cr = np.zeros(n); idx = rng.integers(0, n, int(D * 40)); cr[idx] = rng.uniform(-.6, .6, len(idx)); lo.hold(hp(cr, 2000), .35)
    lo.hold(lp(rng.standard_normal(n), 3000) * .02, 1)
    def wow(x):   # wow/flutter, 27 cycles per loop (0.6 Hz), read circularly
        k = np.arange(len(x)); sh = (np.sin(2 * np.pi * k / len(x) * 27) * 18).astype(int); return x[(k + sh) % len(x)]
    save(lo, 'last-light-radio', 'Last Light Radio', post=wow)

# 5. Horde Night - driving drums, saw riff, stabs (fights). 96 beats at 128 bpm = 45 s, full on from the first beat
def t5():
    b = 60 / 128; lo = Loop(96 * b)
    for i in range(96):
        lo.add(i * b, kick(), .9)
        if i % 2 == 1: lo.add(i * b, lp(rng.standard_normal(int(.18 * SR)), 3000) * np.exp(-np.linspace(0, 6, int(.18 * SR))), .5)
        lo.add(i * b + b / 2, noiseh(.05), .25)
    riff = [40, 40, 43, 40, 46, 45, 43, 41]
    for i in range(192):
        m = riff[(i // 2) % 8]; x = lp(osc('saw', hz(m - 12), b / 2 * .8) + osc('sq', hz(m - 12), b / 2 * .8), 700) * env(int(b / 2 * .8 * SR), .003, .05, .5, .05); lo.add(i * b / 2, x, .45)
    for i in range(12):
        st = pad([52, 55, 58, 63] if i % 2 else [53, 56, 60], b * 1.5, 'saw', 1800, .01, .4); lo.add(i * 8 * b, st, .35)
    save(lo, 'horde-night', 'Horde Night')

# 6. Midnight Carol - the public-domain Shchedryk (Leontovych, 1916) ostinato, slowed and eerie (Christmas event).
#    64 beats at 84 bpm = 45.7 s: 16 bars = 2 x the 8-bar bass line; the answering phrase on bars 0, 4, 8, 12; a toll every 16 beats
def sleigh(d=.25):
    x = rng.standard_normal(int(d * SR)); return hp(x, 5000) * np.exp(-np.linspace(0, 10, len(x)))
def toll(m, d=6):
    f = hz(m); tt = t_(d); return sum(np.sin(2 * np.pi * f * r * tt) * np.exp(-tt * k) for r, k in ((1, .6), (2.4, 1.3), (3.01, 2), (4.17, 3))) * .4
def t7():
    b = 60 / 84; lo = Loop(64 * b); D = lo.dur(); L = lo.L; tt = t_(D)
    lo.hold(holdpad([38, 45, 50], D, 'tri', 500), .3)
    wind = lp(hp(rng.standard_normal(len(tt)), 250), 800) * (.3 + .7 * np.sin(2 * np.pi * tt * (2 / L)) ** 2); lo.hold(wind, .1)
    vib = 1 + .25 * np.sin(2 * np.pi * tt * (round(4.5 * L) / L))
    hum = sum(osc('sin', hz(m), D, dt) * vib for m in (62, 65, 69) for dt in (-.003, .003)) / 6; lo.hold(hum, .14)
    ost = [74, 72, 74, 70]; bassline = [50, 50, 48, 48, 46, 46, 45, 45]
    for i in range(64):
        bar = i // 4
        lo.add(i * b + abs(rng.normal(0, .01)), bell(ost[i % 4] - (12 if bar % 8 in (6, 7) else 0), 2.6, 1.0), .42)
        if i % 4 == 0: lo.add(i * b, bell(bassline[bar % 8] - 12, 4, .45), .3)
        if i % 2 == 0: lo.add(i * b + b * .5, sleigh(), .12)
        if bar % 4 == 0 and i % 4 == 0:
            for k, m in enumerate([77, 76, 77, 74]): lo.add(i * b + k * b + b * .25, bell(m, 2, 1.3), .18)
    for i in range(4): lo.add(i * 16 * b, toll(38), .35)
    save(lo, 'midnight-carol', 'Midnight Carol')

if __name__ == '__main__':
    for f in (t1, t2, t3, t4, t5, t7): f()
    print(json.dumps(TABLE))
