import sys; sys.argv=['x']
exec(open('/home/user/dead-miles/mockups/music/synth.py').read().split('# 1. Lantern Hollow')[0])
# Midnight Carol - the public-domain "Shchedryk" (Carol of the Bells, Leontovych 1916) ostinato on a detuned music box,
# slowed and eerie: sleigh bells dragged at half time, a low drone, wind, a far-off choir hum, one bell-tower toll per phrase.
def sleigh(d=.25):
    x=rng.standard_normal(int(d*SR)); x=hp(x,5000)*np.exp(-np.linspace(0,10,len(x))); return x
def toll(m,d=6):
    f=hz(m); t=t_(d); return sum(np.sin(2*np.pi*f*r*t)*np.exp(-t*k) for r,k in ((1,.6),(2.4,1.3),(3.01,2),(4.17,3)))*.4
def t7():
    D=52; tr=Track(D); b=60/84
    tr.add(0,pad([38,45,50],D,'tri',500,5,5),.3)
    wind=lp(hp(rng.standard_normal(int(D*SR)),250),800)*(.3+.7*np.sin(2*np.pi*t_(D)*.04)**2); tr.add(0,wind,.1)
    hum=sum(osc('sin',hz(m),D,dt)*(1+.25*np.sin(2*np.pi*4.5*t_(D))) for m in (62,65,69) for dt in (-.003,.003))/6
    tr.add(0,hum*env(len(hum),8,1,.85,6),.14)
    ost=[74,72,74,70]            # D C D Bb : the four-note figure, in D minor
    bassline=[50,50,48,48,46,46,45,45]
    for i in range(int(D/b)-3):
        bar=i//4
        tr.add(i*b+rng.normal(0,.01),bell(ost[i%4]-(12 if bar%8 in (6,7) else 0),2.6,1.0),.42)
        if i%4==0: tr.add(i*b,bell(bassline[bar%8]-12,4,.45),.3)
        if bar>=4 and i%2==0: tr.add(i*b+b*.5,sleigh(),.12)
        if bar>=8 and bar%4==0 and i%4==0:   # the answering phrase a step higher, faint
            for k,m in enumerate([77,76,77,74]): tr.add(i*b+k*b+b*.25,bell(m,2,1.3),.18)
    for t0 in np.arange(b*16,D-6,b*16): tr.add(t0,toll(38),.35)
    save(tr,'midnight-carol','Midnight Carol (winter event)')
t7()
