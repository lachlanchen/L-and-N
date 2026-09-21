"""Composite verified app captures onto the L & N backdrop with captions, at store sizes."""
import sys, pathlib
from PIL import Image, ImageDraw, ImageFont, ImageFilter
S=pathlib.Path('/tmp/claude-1000/-home-lachlan-ProjectsLFS-L-And-N/8b9cb924-868e-4a66-8c34-3cb4d5f61ca3/scratchpad')
ROOT=pathlib.Path('/home/lachlan/ProjectsLFS/L-And-N')
BG=ROOT/'store/assets/google-play-screenshot-bg.png'
FONT_BOLD='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
FONT_BLACK='/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc'
CAPTIONS=[  # (capture, eyebrow, title lines)
 ('practice-en','EXPLAINABLE PRACTICE',['Hear it. See it.','Say it better.']),
 ('listen-answering','EAR TRAINING · 59 PAIRS',['Which word','did you hear?']),
 ('listen-result','INSTANT FEEDBACK',['See every miss.','Replay any word.']),
 ('practice-zh','MANDARIN · EVERY FINAL',['蓝 or 南?','Every l/n final.']),
 ('practice-yue-hant','CANTONESE · 廣東話',['你 or 理?','21 Cantonese finals.']),
 ('learn','INTERACTIVE 3D',['See where /l/','lets air flow.']),
 ('progress','KEPT TAKES',['Replay your','best attempts.']),
]
def compose(capture, eyebrow, lines, size, out, scale):
    W,H=size
    bg=Image.open(BG).convert('RGB'); bg=bg.resize((W, int(bg.height*W/bg.width)), Image.LANCZOS)
    if bg.height<H: bg=bg.resize((W,H), Image.LANCZOS)
    canvas=bg.crop((0,0,W,H))
    draw=ImageDraw.Draw(canvas)
    f_eyebrow=ImageFont.truetype(FONT_BOLD, int(34*scale)); f_title=ImageFont.truetype(FONT_BLACK, int(74*scale))
    y=int(70*scale)
    w=draw.textlength(eyebrow, font=f_eyebrow); draw.text(((W-w)/2, y), eyebrow, font=f_eyebrow, fill=(120,232,220)); y+=int(58*scale)
    for line in lines:
        w=draw.textlength(line, font=f_title); draw.text(((W-w)/2, y), line, font=f_title, fill='white'); y+=int(86*scale)
    shot=Image.open(capture).convert('RGB')
    top=y+int(30*scale); avail=H-top+int(60*scale)
    sw=int(W*0.68); sh=int(shot.height*sw/shot.width)
    shot=shot.resize((sw,sh), Image.LANCZOS)
    if sh>avail: shot=shot.crop((0,0,sw,avail)); sh=avail
    radius=int(44*scale)
    mask=Image.new('L',(sw,sh),0); ImageDraw.Draw(mask).rounded_rectangle((0,0,sw-1,sh-1), radius=radius, fill=255)
    shadow=Image.new('RGBA',(W,H),(0,0,0,0)); sd=ImageDraw.Draw(shadow); x=(W-sw)//2
    sd.rounded_rectangle((x-6,top+18,x+sw+6,top+sh+30), radius=radius, fill=(0,0,0,140)); shadow=shadow.filter(ImageFilter.GaussianBlur(int(28*scale)))
    canvas=Image.alpha_composite(canvas.convert('RGBA'), shadow).convert('RGB')
    canvas.paste(shot,(x,top),mask)
    canvas.save(out, optimize=True); print(out, canvas.size)
prefix=sys.argv[1] if len(sys.argv)>1 else 'iphone'
outdir=S/'composed'; outdir.mkdir(exist_ok=True)
n=0
for cap, eyebrow, lines in CAPTIONS:
    src=S/'shots'/f'{prefix}-{cap}.png'
    if not src.exists() or src.stat().st_size<50000: print('skip', src.name); continue
    n+=1
    if prefix=='iphone':
        compose(src, eyebrow, lines, (1080,1920), outdir/f'google-play-phone-{n:02d}.png', 1.0)
        compose(src, eyebrow, lines, (1242,2688), outdir/f'app-store-iphone-65-{n:02d}.png', 1.15)
    else:
        compose(src, eyebrow, lines, (2064,2752), outdir/f'app-store-ipad-13-{n:02d}.png', 1.9)
