# Zombie voice prototype v2: a vocal-fry / growl source instead of a clean sawtooth.
# Glottal pulses with heavy jitter + period doubling (subharmonic growl), pulse-gated rasp noise, vowel formants
# that slide, a tanh throat drive, an irregular "gurgle" tremolo, and creaky fry at the tail (sparse pulses ~35 Hz).
import numpy as np, subprocess, scipy.signal as sg
SR = 44100
def pulses(dur, f0c, jit=.12, sub=.5, shimmer=.35, fry_from=None, seed=1):
    rng = np.random.default_rng(seed); n = int(dur*SR); out = np.zeros(n); t = 0.0; k = 0
    while True:
        i = int(t*SR)
        if i >= n: break
        f0 = np.interp(t/dur, *f0c)
        if fry_from is not None and t/dur > fry_from: f0 = 30 + 15*rng.random()   # creaky fry: slow, uneven pulses
        per = 1/f0 * (1 + rng.normal(0, jit))
        amp = (1 - shimmer*rng.random()) * (sub if k % 2 else 1.0)              # period doubling = growl
        L = max(8, int(per*SR*.6)); ph = np.linspace(0, 1, L)
        g = np.where(ph < .7, .5*(1-np.cos(np.pi*ph/.7)), np.cos(np.pi*(ph-.7)/.6))   # Rosenberg pulse
        seg = g[:max(0, min(L, n-i))]; out[i:i+len(seg)] += amp*seg
        t += max(per, .004); k += 1
    return np.diff(out, prepend=0)*40   # glottal flow derivative
def formants(x, F, bw=(90, 120, 160)):
    # F: list of (t_frac, [f1,f2,f3]) keyframes; apply 3 time-varying resonators in blocks
    n = len(x); y = np.zeros(n); blk = 512
    zi = [None]*3
    for s in range(0, n, blk):
        fr = s/n; fs_ = [np.interp(fr, [k[0] for k in F], [k[1][j] for k in F]) for j in range(3)]
        acc = np.zeros(min(blk, n-s))
        for j,(f,b) in enumerate(zip(fs_, bw)):
            r = np.exp(-np.pi*b/SR); a = [1, -2*r*np.cos(2*np.pi*f/SR), r*r]; bcoef = [1-r]
            if zi[j] is None: zi[j] = np.zeros(2)
            o, zi[j] = sg.lfilter(bcoef, a, x[s:s+blk], zi=zi[j]); acc += o*[1, .7, .35][j]
        y[s:s+blk] = acc
    return y
V = {'uh': [600, 1050, 2400], 'aw': [700, 1000, 2500], 'oh': [450, 800, 2500], 'ah': [800, 1200, 2500], 'uu': [350, 700, 2300], 'eh': [550, 1700, 2500]}
def voice(dur, f0c, vow, jit=.12, sub=.5, rasp=.5, drive=2.5, gurgle=0, fry_from=.75, seed=1, gain=1):
    rng = np.random.default_rng(seed+7); n = int(dur*SR); t = np.arange(n)/SR
    src = pulses(dur, f0c, jit, sub, .35, fry_from, seed)
    env_p = np.abs(sg.hilbert(src)); env_p = sg.lfilter([.02], [1, -.98], env_p)
    noise = rng.standard_normal(n); noise = sg.lfilter(*sg.butter(2, [300/(SR/2), 2400/(SR/2)], 'band'), noise)
    x = src + rasp*noise*env_p*1.6 + .015*rasp*noise
    keys = [(i/(len(vow)-1) if len(vow) > 1 else 0, V[v]) for i, v in enumerate(vow)]
    if len(keys) == 1: keys.append((1, keys[0][1]))
    y = formants(x, keys)
    y = np.tanh(drive*y/np.max(np.abs(y)+1e-9))                      # throat drive / rasp
    if gurgle: trem = 1 - gurgle*(.5+.5*np.sign(np.sin(2*np.pi*np.cumsum(14+10*rng.random(n))/SR))); y *= sg.lfilter([.05], [1, -.95], trem)
    a = int(.12*SR); r = int(.25*SR); env = np.ones(n); env[:a] = np.linspace(0, 1, a)**1.5; env[-r:] *= np.linspace(1, 0, r)
    y *= env * (0.8 + .2*np.sin(2*np.pi*t*rng.uniform(2, 4)))
    y = sg.lfilter(*sg.butter(4, 2600/(SR/2)), y); y = sg.lfilter(*sg.butter(1, 70/(SR/2), 'high'), y)
    return gain*y/np.max(np.abs(y)+1e-9)
def room(x, mix=.18):
    n = int(.6*SR); rng = np.random.default_rng(3); ir = rng.standard_normal(n)*np.exp(-np.linspace(0, 9, n)); ir = sg.lfilter(*sg.butter(2, 2500/(SR/2)), ir)
    w = sg.fftconvolve(x, ir)[:len(x)]; w /= np.max(np.abs(w))+1e-9; return (1-mix)*x + mix*w
def save(x, name):
    x = room(np.concatenate([x, np.zeros(int(.4*SR))])); x = .9*x/np.max(np.abs(x))
    pcm = (x*32767).astype('<i2').tobytes()
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', '-b:a', '128k', f'/home/user/dead-miles/mockups/groans/{name}.mp3'], input=pcm, check=True)
P = lambda *pts: ([p[0] for p in pts], [p[1] for p in pts])
clips = {
 '1-low-moan':   voice(2.2, P((0, 85), (.4, 100), (1, 70)), ['uh', 'aw', 'oh'], jit=.10, sub=.55, rasp=.4, drive=2, fry_from=.72, seed=1),
 '2-growl':      voice(1.4, P((0, 95), (.3, 115), (1, 80)), ['ah', 'uh'], jit=.16, sub=.35, rasp=.8, drive=4, fry_from=.8, seed=2),
 '3-gurgle':     voice(1.8, P((0, 80), (1, 65)), ['oh', 'uu', 'uh'], jit=.14, sub=.5, rasp=.6, drive=3, gurgle=.6, fry_from=.7, seed=3),
 '4-hungry-wail':voice(2.4, P((0, 120), (.35, 165), (.7, 130), (1, 90)), ['uh', 'ah', 'aw', 'oh'], jit=.09, sub=.6, rasp=.45, drive=2.5, fry_from=.85, seed=4),
 '5-snarl':      voice(.9, P((0, 140), (.25, 180), (1, 110)), ['eh', 'ah'], jit=.2, sub=.3, rasp=1.0, drive=6, fry_from=.9, seed=5),
 '6-fry-rattle': voice(1.6, P((0, 70), (1, 55)), ['uh', 'oh'], jit=.22, sub=.4, rasp=.7, drive=3, fry_from=.25, seed=6),
}
for k, v in clips.items(): save(v, k)
# one reel with gaps so she can compare them in a row
reel = np.concatenate(sum([[v, np.zeros(int(.7*SR))] for v in clips.values()], []))
save(reel, '0-all-groans-reel')
print('ok')
