import numpy as np, subprocess, sys, os
SR=22050
rng=np.random.default_rng(7)
def t_(d): return np.arange(int(d*SR))/SR
def env(n,a=.01,d=.1,s=.6,r=.3,dur=None):
    L=n; e=np.ones(L)*s; A=max(1,int(a*SR)); D=max(1,int(d*SR)); R=max(1,int(r*SR))
    e[:A]=np.linspace(0,1,A)[:L] if A<=L else np.linspace(0,1,L)
    if A<L: e[A:A+D]=np.linspace(1,s,min(D,L-A))
    if R<L: e[-R:]*=np.linspace(1,0,R)
    return e
def hz(m): return 440*2**((m-69)/12)
def osc(kind,f,d,detune=0):
    t=t_(d); ph=2*np.pi*f*(1+detune)*t
    if kind=='sin': return np.sin(ph)
    if kind=='tri': return 2/np.pi*np.arcsin(np.sin(ph))
    if kind=='saw': return 2*((f*(1+detune)*t)%1)-1
    if kind=='sq': return np.sign(np.sin(ph))*.6
def lp(x,cut):
    X=np.fft.rfft(x); fr=np.fft.rfftfreq(len(x),1/SR); X*=1/(1+(fr/cut)**4); return np.fft.irfft(X,len(x))
def hp(x,cut):
    X=np.fft.rfft(x); fr=np.fft.rfftfreq(len(x),1/SR); X*=1/(1+(cut/np.maximum(fr,1))**4); return np.fft.irfft(X,len(x))
def reverb(x,dec=2.5,mix=.35):
    n=int(dec*SR); ir=rng.standard_normal(n)*np.exp(-np.linspace(0,7,n)); ir=lp(ir,4000); ir/=np.abs(ir).sum()/12
    L=len(x)+n; X=np.fft.rfft(x,L)*np.fft.rfft(ir,L); w=np.fft.irfft(X,L)[:len(x)]
    return x*(1-mix)+w*mix
class Track:
    def __init__(s,d): s.buf=np.zeros(int(d*SR)+SR*4)
    def add(s,t0,sig,g=1):
        i=int(t0*SR); s.buf[i:i+len(sig)]+=sig[:len(s.buf)-i]*g
def bell(m,d=2.5,br=1.0):  # music box / celesta
    f=hz(m); t=t_(d); x=(np.sin(2*np.pi*f*t)+.4*np.sin(2*np.pi*f*2.01*t)*np.exp(-t*3)+.2*np.sin(2*np.pi*f*3.98*t)*np.exp(-t*6))*np.exp(-t*br*1.6)
    x[:60]*=np.linspace(0,1,60); return x
def pad(ms,d,kind='saw',cut=900,a=1.5,r=2):
    x=sum(osc(kind,hz(m),d,dt) for m in ms for dt in (-.004,.004))/(2*len(ms)); return lp(x,cut)*env(len(x),a,.5,.8,r)
def kick(d=.35):
    t=t_(d); f=50+90*np.exp(-t*25); return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*9)
def noiseh(d=.08,cut=6000):
    x=rng.standard_normal(int(d*SR)); return hp(x,cut)*np.exp(-np.linspace(0,8,len(x)))
def heart(): return kick(.25)*.9
def clank(d=1.5):
    t=t_(d); x=sum(np.sin(2*np.pi*f*t)*np.exp(-t*k) for f,k in ((523,5),(1187,7),(1931,9),(2733,12)))
    return x*.3
def piano(m,d=2.2):
    f=hz(m); t=t_(d); x=sum(np.sin(2*np.pi*f*n*(1+.0007*n)*t)*np.exp(-t*(1.2+n*.9))/n for n in range(1,7))
    x[:40]*=np.linspace(0,1,40); return x*.6
def save(tr,name,title):
    x=tr.buf; x=reverb(x, 3.0, .32); x=x/np.max(np.abs(x))*.85
    fade=int(2.5*SR); x[-fade:]*=np.linspace(1,0,fade)
    st=np.stack([x, np.roll(x,int(.011*SR))],1)
    pcm=(st*32767).astype('<i2').tobytes()
    out=f'/home/user/dead-miles/mockups/music/{name}.mp3'
    subprocess.run(['ffmpeg','-y','-loglevel','error','-f','s16le','-ar',str(SR),'-ac','2','-i','-','-metadata',f'title={title}','-b:a','128k',out],input=pcm,check=True)
    print(out)
PHRY=[0,1,3,5,7,8,10]   # phrygian
def scale(root,steps,sc=PHRY): return [root+12*(s//7)+sc[s%7] for s in steps]

# 1. Lantern Hollow - lullaby music box, out of tune, home screen calm
def t1():
    D=48; tr=Track(D); bpm=72; b=60/bpm
    tr.add(0,pad([45,52,57],D,'tri',500,4,4),.35)
    mel=[7,6,4,3,4,6,7,9, 7,6,4,3,1,0,1,3]
    for i in range(int(D/b/1)-2):
        s=mel[i%len(mel)]; tr.add(i*b+rng.normal(0,.012),bell(scale(69,[s])[0]+(-12 if i%16>11 else 0),3,1.2),.45)
        if i%4==0: tr.add(i*b,bell(57+[0,3,-2,-5][(i//4)%4],4,.6),.25)
    save(tr,'lantern-hollow','Lantern Hollow (calm, home)')
# 2. Rust & Hum - dark ambient drone with distant metal
def t2():
    D=50; tr=Track(D)
    dr=osc('saw',hz(33),D,0)+osc('saw',hz(33),D,.006)+.6*osc('saw',hz(40),D,-.004)
    lfo=.5+.5*np.sin(2*np.pi*t_(D)*.07); dr=lp(dr,260)*(.6+.4*lfo); tr.add(0,dr*env(len(dr),4,1,1,5),.4)
    wind=lp(hp(rng.standard_normal(int(D*SR)),300),900)*(.4+.6*np.sin(2*np.pi*t_(D)*.05)**2); tr.add(0,wind,.12)
    for t0 in rng.uniform(2,D-3,9): tr.add(t0,clank(2.5)*rng.uniform(.3,.8),.25)
    for i,t0 in enumerate(np.arange(6,D-6,7.5)): tr.add(t0,bell(scale(57,[[0,1,3,1,0,-2][i%6]])[0],5,.4),.3)
    save(tr,'rust-and-hum','Rust & Hum (ambient, walking)')
# 3. Brownstone Pulse - looting tension, bass pulse + heartbeat
def t3():
    D=46; tr=Track(D); bpm=96; b=60/bpm
    tr.add(0,pad([40,47,52],D,'saw',600,3,3),.2)
    bass=[40,40,41,40, 40,40,43,41]
    for i in range(int(D/(b/2))-4):
        m=bass[(i//2)%8]; x=lp(osc('saw',hz(m-12),b/2*.9),400+300*((i%8)/8))*env(int(b/2*.9*SR),.005,.08,.4,.08); tr.add(i*b/2,x,.5)
    for i in range(int(D/b)-2):
        if i>=8 and i%2==0: tr.add(i*b,heart(),.6); tr.add(i*b+.18,heart(),.4)
        if i>=16 and i%4==3: tr.add(i*b+b/2,noiseh(.06),.25)
    for i,t0 in enumerate(np.arange(4,D-4,b*4)): tr.add(t0,bell(scale(64,[[4,3,1,0,1,3,4,6][i%8]])[0],2.5),.3)
    save(tr,'brownstone-pulse','Brownstone Pulse (looting, tense)')
# 4. Last Light Radio - lo-fi detuned piano + crackle, base / menu
def t4():
    D=50; tr=Track(D); b=60/64
    chords=[[45,52,57,60],[41,48,53,57],[43,50,55,59],[40,47,52,56]]
    for i in range(int(D/(b*4))):
        c=chords[i%4]
        for j,m in enumerate(c): tr.add(i*b*4+j*.06,piano(m,4),.35)
        for k,m in enumerate([c[-1]+12,c[-2]+12,c[-1]+12+(2 if i%2 else -1)]): tr.add(i*b*4+b*(1.5+k),piano(m,1.8),.25)
    cr=np.zeros(int(D*SR)); idx=rng.integers(0,len(cr),D*40); cr[idx]=rng.uniform(-.6,.6,len(idx)); tr.add(0,hp(cr,2000),.35)
    tr.add(0,lp(rng.standard_normal(int(D*SR)),3000)*.02,1)
    # wow/flutter
    x=tr.buf; n=np.arange(len(x)); sh=(np.sin(2*np.pi*n/SR*.6)*18).astype(int); tr.buf=x[np.clip(n+sh,0,len(x)-1)]
    save(tr,'last-light-radio','Last Light Radio (lo-fi, base)')
# 5. Horde Night - driving drums, saw stabs, fast
def t5():
    D=44; tr=Track(D); bpm=128; b=60/bpm
    for i in range(int(D/b)-2):
        tr.add(i*b,kick(),.9 if i>=4 else .5)
        if i%2==1 and i>=8: tr.add(i*b,lp(rng.standard_normal(int(.18*SR)),3000)*np.exp(-np.linspace(0,6,int(.18*SR))),.5)
        if i>=4: tr.add(i*b+b/2,noiseh(.05),.25)
    riff=[40,40,43,40,46,45,43,41]
    for i in range(int(D/(b/2))-4):
        if i<16: continue
        m=riff[(i//2)%8]; x=lp(osc('saw',hz(m-12),b/2*.8)+osc('sq',hz(m-12),b/2*.8),700)*env(int(b/2*.8*SR),.003,.05,.5,.05); tr.add(i*b/2,x,.45)
    for i,t0 in enumerate(np.arange(b*32,D-2,b*8)):
        st=pad([52,55,58,63] if i%2 else [53,56,60],b*1.5,'saw',1800,.01,.4); tr.add(t0,st,.35)
    save(tr,'horde-night','Horde Night (fights, horde watch)')
# 6. Frost on the Glass - winter event, celesta + choir-ish pad
def t6():
    D=46; tr=Track(D); b=60/80
    tr.add(0,pad([50,57,62,65],D,'tri',1400,5,5),.25)
    choir=sum(osc('sin',hz(m),D,dt)*(1+.3*np.sin(2*np.pi*5*t_(D))) for m in (62,69) for dt in (-.003,.003))/4
    tr.add(0,choir*env(len(choir),6,1,.9,6),.18)
    mel=[9,7,9,11,12,11,9,7, 5,7,9,7,5,4,2,4]
    MAJ=[0,2,3,5,7,8,11]   # harmonic minor
    for i in range(int(D/b)-3):
        s=mel[i%16]; tr.add(i*b,bell(scale(74,[s],MAJ)[0],3,.9),.35)
        if i%8==0: tr.add(i*b,bell(scale(62,[[0,5,3,4][(i//8)%4]],MAJ)[0],4,.5),.3)
        tr.add(i*b+b/2,noiseh(.03,9000),.06)
    save(tr,'frost-on-the-glass','Frost on the Glass (winter event)')
for f in (t1,t2,t3,t4,t5,t6): f()
