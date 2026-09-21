import sys, json, time, base64, datetime
sys.argv=['cdp.py','9485','tabs']; exec(open('cdp.py').read().split("if cmd=='tabs':")[0])
S='/tmp/claude-1000/-home-lachlan-ProjectsLFS-L-And-N/8b9cb924-868e-4a66-8c34-3cb4d5f61ca3/scratchpad'
tid=open(S+'/cap-tab-id.txt').read().strip(); t=[x for x in tabs() if x['id']==tid][0]; c=C(t['webSocketDebuggerUrl'])
c.call('Page.bringToFront')
def ev(e): return c.call('Runtime.evaluate', expression=e, returnByValue=True, awaitPromise=True)['result'].get('value')
def mouse(x,y):
    for typ,extra in (('mouseMoved',{}),('mousePressed',{'button':'left','clickCount':1}),('mouseReleased',{'button':'left','clickCount':1})):
        c.call('Input.dispatchMouseEvent', type=typ, x=x, y=y, **extra)
def click(js):
    r=ev('(()=>{const e=%s; if(!e) return null; e.scrollIntoView({block:"center"}); const q=e.getBoundingClientRect(); return {x:q.x+q.width/2,y:q.y+q.height/2}})()' % js)
    if r: mouse(r['x'], r['y'])
    return r
def wait_for(js, seconds=15):
    for _ in range(seconds*2):
        if ev('!!(%s)' % js): return True
        time.sleep(0.5)
    return False
def by_test(id_):
    wait_for("document.querySelector('[data-testid=%s]')" % json.dumps(id_)); time.sleep(0.3)
    return click("document.querySelector('[data-testid=%s]')" % json.dumps(id_))
def by_text(txt, sel='button'): return click('[...document.querySelectorAll(%s)].find(b=>b.getBoundingClientRect().width>0&&b.innerText.trim().startsWith(%s))' % (json.dumps(sel), json.dumps(txt)))
def shot(name, focus=None):
    if focus: ev('(()=>{const e=document.querySelector(%s); if(e){e.scrollIntoView({block:"center"});} })()' % json.dumps(focus))
    else: ev('window.scrollTo(0,0)')
    time.sleep(0.8)
    r=c.call('Page.captureScreenshot', format='png'); open(f'{S}/shots/{name}.png','wb').write(base64.b64decode(r['data'])); print('shot', name)
def setup(w,h,dpr,mobile):
    c.call('Emulation.setDeviceMetricsOverride', width=w, height=h, deviceScaleFactor=dpr, mobile=mobile)
    c.call('Page.navigate', url='https://l-and-n.lazying.art/?shots='+str(int(time.time()))); time.sleep(6)
    now=datetime.datetime.utcnow()
    attempts=[]
    for i,(ex,score,det) in enumerate([('en-light-night',92,'L'),('en-night-light',88,'N'),('zh-li-ni',81,'L'),('yue-nei-lei',95,'N'),('en-lead-need',74,'L'),('en-line-nine',90,'L')]):
        created=(now-datetime.timedelta(minutes=7*i)).isoformat()+'Z'
        attempts.append({'exerciseId':ex,'score':score,'createdAt':created,'detectedSound':det,'target':det,'language':'en-US' if ex.startswith('en') else ('zh-CN' if ex.startswith('zh') else 'yue-HK'),'takeId':created})
    listening=[{'pairId':'en-light-night|en-night-light','language':'en-US','total':5,'correct':5,'createdAt':(now-datetime.timedelta(minutes=3)).isoformat()+'Z'},{'pairId':'zh-li-ni|zh-ni-li','language':'zh-CN','total':7,'correct':6,'createdAt':(now-datetime.timedelta(minutes=30)).isoformat()+'Z'}]
    ev('localStorage.setItem("CapacitorStorage.landn.attempts.v1", %s); localStorage.setItem("CapacitorStorage.landn.listening.v1", %s); 1' % (json.dumps(json.dumps(attempts)), json.dumps(json.dumps(listening))))
    c.call('Page.reload'); time.sleep(6)
    ev('(()=>{const st=document.createElement("style"); st.textContent="::-webkit-scrollbar{display:none} html{scrollbar-width:none}"; document.head.appendChild(st); return 1})()')
NAV_MARKERS={'Practice':'SOUND DRILL','Listen':'EAR TRAINING','Learn':'Learn','Progress':'Progress','練習':'練習'}
def tab(index, marker):
    for attempt in range(3):
        nav=ev('[...document.querySelectorAll(".bottom-nav button")].map(b=>{const q=b.getBoundingClientRect(); return [q.x+q.width/2,q.y+q.height/2]})') or []
        if len(nav)>index: mouse(*nav[index]); time.sleep(1.5)
        if ev('document.body.innerText.includes(%s)' % json.dumps(marker)): return True
        ev('[...document.querySelectorAll(".bottom-nav button")][%d].click()' % index); time.sleep(1.5)
        if ev('document.body.innerText.includes(%s)' % json.dumps(marker)): return True
    print('tab failed', index, marker); return False
def run(prefix):
    tab(0, 'SOUND DRILL'); shot(prefix+'-practice-en')
    by_text('Mandarin'); time.sleep(1.5)
    click('[...document.querySelectorAll("button")].find(b=>b.getBoundingClientRect().width>0&&/next/i.test(b.getAttribute("aria-label")||""))'); time.sleep(1)
    shot(prefix+'-practice-zh')
    tab(1, 'EAR TRAINING'); time.sleep(1)
    print('play', by_test('exam-play'))
    for _ in range(30):
        time.sleep(1)
        if ev('!!document.querySelector("[data-testid=exam-replay]")'): break
    print('phase', ev('document.querySelector(".exam-actions")?.innerText'))
    time.sleep(1); by_test('exam-choose-l'); time.sleep(0.4); by_test('exam-choose-n'); time.sleep(0.6)
    shot(prefix+'-listen-answering', '.hear-words')
    seq=ev('[...document.querySelectorAll(".exam-dots i")].length')
    for i in range(2, seq): by_test('exam-choose-l' if i%2==0 else 'exam-choose-n'); time.sleep(0.3)
    by_test('exam-submit'); time.sleep(2); print('result', ev('!!document.querySelector("[data-testid=exam-result]")')); shot(prefix+'-listen-result', '[data-testid=exam-result]')
    tab(3, 'Progress'); time.sleep(3); print('history rows', ev('document.querySelectorAll("[data-testid=history-play]").length')); shot(prefix+'-progress', '[data-testid=history-play]')
    ev('(()=>{const s=document.querySelector("[data-testid=ui-language-picker]"); const set=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value").set; set.call(s,"zh-Hant"); s.dispatchEvent(new Event("change",{bubbles:true})); return s.value})()'); time.sleep(1.5)
    tab(0, '練習'); by_text('廣東話'); time.sleep(1.5); shot(prefix+'-practice-yue-hant')
    ev('(()=>{const s=document.querySelector("[data-testid=ui-language-picker]"); const set=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value").set; set.call(s,"en"); s.dispatchEvent(new Event("change",{bubbles:true})); return s.value})()'); time.sleep(1)
    if ev('(()=>{try{const c=document.createElement("canvas"); return !!(c.getContext("webgl2")||c.getContext("webgl"))}catch(e){return false}})()'):
        tab(2, 'Learn'); time.sleep(8); print('canvas', ev('document.querySelectorAll("canvas").length')); shot(prefix+'-learn')
    else:
        print('no WebGL in this browser; Learn capture skipped')
import os
which=os.environ.get("SHOT_DEVICE","iphone")
if which=='iphone': setup(414, 896, 3, False); run('iphone')
else: setup(1032, 1376, 2, False); run('ipad')
print('done')
