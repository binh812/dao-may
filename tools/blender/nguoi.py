# Hai nhan vat nguoi cach dieu (dau to than nho) dung bang kit.py: hoang tu (toc xoan, ao xanh, khan do dai) va
# cong chua (mu rong vanh, vay hoa hinh chuong, no sau lung). Vai co chuoi xuong rieng de dung dua va tre lai sau than.
# Chay:  blender -b -P tools/blender/nguoi.py -- <hoang-tu|cong-chua> <thu muc anh duyet> <duong dan .glb>
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import Builder, X, Y, Z   # noqa: E402

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
WHO = argv[0] if argv else 'hoang-tu'
REVIEW_DIR = argv[1] if len(argv) > 1 else 'review'
GLB_PATH = argv[2] if len(argv) > 2 else f'{WHO}.glb'
PRINCE = WHO == 'hoang-tu'
TAU = math.tau
SKIRT_CHAINS, SKIRT_TOP, SKIRT_HEM = 6, 0.445, 0.15
SKIRT_RINGS = [(0.445, 0.105), (0.40, 0.15), (0.34, 0.20), (0.27, 0.245), (0.20, 0.28), (0.15, 0.30)]
SCARF = [f'scarf.{i}' for i in range(1, 6)]
BOW = {side: [f'bow.{side}.1', f'bow.{side}.2'] for side in 'LR'}

COMMON_COLORS = {'da': (1.0, 0.85, 0.74), 'den': (0.12, 0.09, 0.11), 'trang': (0.98, 0.97, 0.95), 'hong': (0.98, 0.60, 0.60), 'moi': (0.80, 0.33, 0.33)}
COLORS = {**COMMON_COLORS, **({'toc': (0.46, 0.27, 0.15), 'ao': (0.26, 0.52, 0.30), 'quan': (0.20, 0.42, 0.25), 'nau': (0.50, 0.30, 0.16), 'vang': (0.90, 0.72, 0.25), 'khan': (0.82, 0.25, 0.18)}
                              if PRINCE else {'toc': (0.24, 0.15, 0.13), 'vay': (0.11, 0.10, 0.13), 'nhuy': (0.96, 0.78, 0.25), 'dai': (0.97, 0.80, 0.84)})}

BONES = {
    'root': ((0, 0, 0), (0, 0, 0.10), None),
    'hips': ((0, 0, 0.34), (0, 0, 0.42), 'root'),
    'spine': ((0, 0, 0.42), (0, 0, 0.60), 'hips'),
    'head': ((0, 0, 0.60), (0, 0, 0.95), 'spine'),
    'eyes': ((0, -0.18, 0.765), (0, -0.18, 0.84), 'head'),
    'arm.L': ((0.135, 0, 0.555), (0.215, 0, 0.37), 'spine'), 'arm.R': ((-0.135, 0, 0.555), (-0.215, 0, 0.37), 'spine'),
    'leg.L': ((0.07, 0, 0.34), (0.07, 0, 0.02), 'hips'), 'leg.R': ((-0.07, 0, 0.34), (-0.07, 0, 0.02), 'hips'),
}
if PRINCE:
    for i, name in enumerate(SCARF):
        BONES[name] = ((0.03, 0.10 + 0.065 * i, 0.59 - 0.075 * i), (0.03, 0.165 + 0.065 * i, 0.515 - 0.075 * i), SCARF[i - 1] if i else 'spine')
else:
    for k in range(SKIRT_CHAINS):
        c, s = math.cos(k / SKIRT_CHAINS * TAU), math.sin(k / SKIRT_CHAINS * TAU)
        BONES[f'skirt.{k}.1'] = ((0.11 * c, 0.11 * s, 0.44), (0.20 * c, 0.20 * s, 0.31), 'hips')
        BONES[f'skirt.{k}.2'] = ((0.20 * c, 0.20 * s, 0.31), (0.30 * c, 0.30 * s, 0.15), f'skirt.{k}.1')
    for side, sx in (('L', 1), ('R', -1)):
        BONES[f'bow.{side}.1'] = ((0.03 * sx, 0.125, 0.44), (0.05 * sx, 0.17, 0.34), 'hips')
        BONES[f'bow.{side}.2'] = ((0.05 * sx, 0.17, 0.34), (0.06 * sx, 0.205, 0.24), f'bow.{side}.1')

b = Builder('HoangTu' if PRINCE else 'CongChua', COLORS, BONES)

# ------------------------------------------------------------------ buoc 3: phac khoi, dau to than nho (dung chung)
b.limb((0, 0, 0.575), (0, 0, 0.62), 0.042, 0.042, 'spine', 'da', 10)                     # co
b.ball((0, 0, 0.76), (0.20, 0.19, 0.185), 'head', 'da', 24)                               # dau
for sx in (-1, 1):
    b.ball((sx * 0.075, -0.178, 0.765), (0.027, 0.015, 0.040), 'eyes', 'den', 12)        # mat cao kieu truyen tranh
    b.ball((sx * 0.083, -0.192, 0.778), (0.008, 0.005, 0.008), 'eyes', 'trang', 8)       # dom sang trong mat
    b.ball((sx * 0.125, -0.143, 0.71), (0.032, 0.012, 0.020), 'head', 'hong', 10)        # ma hong
    b.ball((sx * 0.20, 0.0, 0.75), (0.028, 0.03, 0.04), 'head', 'da', 10)                # tai
b.ball((0, -0.183, 0.695), (0.020, 0.008, 0.009), 'head', 'moi', 10)                      # mieng


def skirt_weights(co):
    """Vay: gan eo thi theo hong, xuong duoi chia cho hai chuoi xuong gan nhat theo goc va hai dot theo chieu cao."""
    t = min(max((SKIRT_TOP - co.z) / (SKIRT_TOP - SKIRT_HEM), 0.0), 1.0)
    turn = (math.atan2(co.y, co.x) / TAU) % 1.0 * SKIRT_CHAINS
    k0, frac = int(turn) % SKIRT_CHAINS, turn - int(turn)
    top = max(0.0, 1.0 - t / 0.2)
    low = min(max((t - 0.35) / 0.4, 0.0), 1.0)
    table = {'hips': top}
    for k, share in ((k0, 1 - frac), ((k0 + 1) % SKIRT_CHAINS, frac)):
        table[f'skirt.{k}.1'] = (1 - top) * (1 - low) * share
        table[f'skirt.{k}.2'] = (1 - top) * low * share
    return table


def skirt_radius(z):
    for (z0, r0), (z1, r1) in zip(SKIRT_RINGS, SKIRT_RINGS[1:]):
        if z1 <= z <= z0: return r0 + (r1 - r0) * (z0 - z) / (z0 - z1)
    return SKIRT_RINGS[-1][1]


if PRINCE:
    # buoc 4: xep lop ao tunic > that lung > quan rong > giay bot > khan
    b.ball((0, 0, 0.49), (0.125, 0.10, 0.12), 'spine', 'ao')
    b.lathe([(0.45, 0.122), (0.37, 0.15), (0.31, 0.168)], 'hips', 'ao')                    # ta ao xoe
    b.ring((0, 0, 0.428), 0.126, 0.018, 'hips', 'nau', 0.8)                                 # that lung
    b.ball((0, -0.135, 0.428), (0.022, 0.012, 0.022), 'hips', 'vang', 8)                    # khoa
    for sx, tag in ((1, 'L'), (-1, 'R')):
        b.limb((sx * 0.135, 0, 0.555), (sx * 0.205, 0, 0.40), 0.05, 0.043, f'arm.{tag}', 'ao')
        b.ball((sx * 0.218, 0, 0.365), (0.036, 0.036, 0.040), f'arm.{tag}', 'da', 10)
        b.limb((sx * 0.07, 0, 0.33), (sx * 0.07, 0, 0.14), 0.072, 0.066, f'leg.{tag}', 'quan')
        b.limb((sx * 0.07, 0, 0.125), (sx * 0.07, 0, 0.05), 0.058, 0.054, f'leg.{tag}', 'nau')
        b.ball((sx * 0.07, -0.035, 0.036), (0.058, 0.092, 0.038), f'leg.{tag}', 'nau', 12)
    b.curls((0, 0.01, 0.78), (0.20, 0.195, 0.19), 0.062, 110, 'head', 'toc', lambda d: d.z > 0.30 or (d.y > 0.05 and d.z > -0.45))
    b.ring((0, 0, 0.605), 0.082, 0.036, 'spine', 'khan', 0.85)                              # khan quanh co
    b.strip(SCARF, 0.05, 0.012, 'khan')                                                      # duoi khan dai co chuoi xuong rieng
else:
    # buoc 4: xep lop vay > dai va no > bot > mu
    b.ball((0, 0, 0.50), (0.105, 0.085, 0.10), 'spine', 'vay')
    b.lathe(SKIRT_RINGS, skirt_weights, 'vay')                                               # vay hinh chuong
    for i in range(18):                                                                      # hoa trang tren vay, bam theo vay khi vay dung dua
        a, z = (i * 0.618) % 1.0 * TAU, 0.38 - 0.20 * ((i * 7) % 10) / 10
        r = skirt_radius(z) + 0.004
        centre = (r * math.cos(a), r * math.sin(a), z)
        tangent = (-math.sin(a), math.cos(a), 0.0)
        b.ball(centre, (0.011, 0.011, 0.011), skirt_weights, 'nhuy', 8)
        for p in range(5):
            u, w = 0.022 * math.cos(p / 5 * TAU), 0.022 * math.sin(p / 5 * TAU)
            b.ball((centre[0] + tangent[0] * u, centre[1] + tangent[1] * u, centre[2] + w), (0.015, 0.015, 0.015), skirt_weights, 'trang', 8)
    b.ring((0, 0, 0.447), 0.108, 0.02, 'hips', 'trang', 0.9)                                 # dai lung
    b.ball((0, 0.125, 0.447), (0.022, 0.018, 0.022), 'hips', 'trang', 8)                     # nut no
    for sx, tag in ((1, 'L'), (-1, 'R')):
        b.ball((sx * 0.062, 0.135, 0.462), (0.05, 0.018, 0.034), 'hips', 'trang', 10)       # canh no
        b.strip(BOW[tag], 0.022, 0.006, 'trang')                                             # day no co xuong rieng
        b.ball((sx * 0.138, 0, 0.555), (0.062, 0.058, 0.055), 'spine', 'vay', 12)            # tay phong
        b.limb((sx * 0.155, 0, 0.52), (sx * 0.208, 0, 0.395), 0.030, 0.026, f'arm.{tag}', 'da')
        b.ball((sx * 0.216, 0, 0.365), (0.032, 0.032, 0.036), f'arm.{tag}', 'da', 10)
        b.limb((sx * 0.055, 0, 0.33), (sx * 0.055, 0, 0.15), 0.034, 0.030, f'leg.{tag}', 'da')
        b.limb((sx * 0.055, 0, 0.14), (sx * 0.055, 0, 0.05), 0.043, 0.044, f'leg.{tag}', 'trang')
        b.ball((sx * 0.055, -0.03, 0.034), (0.046, 0.078, 0.034), f'leg.{tag}', 'trang', 12)
    b.ball((0, 0.03, 0.775), (0.205, 0.195, 0.165), 'head', 'toc', 20)                       # nen toc bob
    b.curls((0, 0.015, 0.775), (0.205, 0.20, 0.19), 0.074, 90, 'head', 'toc', lambda d: (d.z < 0.55 and d.y > -0.10 and d.z > -0.72) or (d.y < -0.30 and 0.30 < d.z < 0.55))   # dinh dau de mu che; chi giu toc hai ben, sau gay va mai truoc
    b.lathe([(0.945, 0.19), (0.935, 0.29), (0.915, 0.37), (0.890, 0.42), (0.905, 0.37), (0.922, 0.29), (0.930, 0.19)], 'head', 'trang')   # vanh mu rong, hoi ru, co be day
    b.ball((0, 0.005, 0.925), (0.218, 0.212, 0.135), 'head', 'trang', 22)                    # chop mu trum kin dinh dau
    b.ring((0, 0.005, 0.950), 0.214, 0.016, 'head', 'dai', 0.9)                              # dai mu

b.build()
turn = b.turn


# ------------------------------------------------------------------ buoc 6-7: hoat anh tung doan; vai tre lai sau than
def cloth(t, mode):
    """Tu the cua cac chuoi xuong vai. mode: 'idle' | 'walk' | 'turn'. Moi dot dung cung song voi than nhung tre dan."""
    pose, flare = {}, math.sin(math.pi * t) if mode == 'turn' else 0.0
    if PRINCE:
        for i, name in enumerate(SCARF):
            lag = 0.7 * (i + 1)
            if mode == 'idle': q = turn(name, X, 0.04 * math.sin(t * TAU - lag)) @ turn(name, Y, 0.05 * math.sin(t * TAU * 0.5 - lag))
            elif mode == 'walk': q = turn(name, X, 0.16 + 0.07 * i + 0.09 * math.sin(2 * t * TAU - lag)) @ turn(name, Z, 0.14 * math.sin(t * TAU - lag))
            else: q = turn(name, Z, -0.22 * flare * (1 + 0.3 * i)) @ turn(name, X, 0.22 * flare)
            pose[name] = {'rot': q}
        return pose
    for k in range(SKIRT_CHAINS):
        a = k / SKIRT_CHAINS * TAU
        tangent, back = (-math.sin(a), math.cos(a), 0.0), max(0.0, math.sin(a))
        for j in (1, 2):
            lag = 0.5 * j + 0.4 * k
            if mode == 'idle': out = 0.025 * math.sin(t * TAU - lag)
            elif mode == 'walk': out = 0.10 * back + 0.07 * math.sin(2 * t * TAU - lag) + 0.05 * math.sin(t * TAU + a - lag)
            else: out = flare * (0.30 if j == 1 else 0.16)
            twist = -0.16 * flare * j if mode == 'turn' else 0.0
            pose[f'skirt.{k}.{j}'] = {'rot': turn(f'skirt.{k}.{j}', Z, twist) @ turn(f'skirt.{k}.{j}', tangent, -out)}   # goc am la xoe ra ngoai
    for side in 'LR':
        for j, name in enumerate(BOW[side]):
            lag = 0.8 * (j + 1)
            if mode == 'idle': q = turn(name, X, 0.04 * math.sin(t * TAU - lag))
            elif mode == 'walk': q = turn(name, X, 0.22 + 0.12 * j + 0.10 * math.sin(2 * t * TAU - lag)) @ turn(name, Z, 0.12 * math.sin(t * TAU - lag))
            else: q = turn(name, Z, -0.30 * flare * (j + 1)) @ turn(name, X, 0.30 * flare)
            pose[name] = {'rot': q}
    return pose


def idle(t):
    breath, blink = math.sin(t * TAU), 0.12 if 0.62 < t < 0.68 else 1.0
    return {'spine': {'scale': (1 + 0.012 * breath, 1 + 0.02 * breath, 1 + 0.012 * breath)},
            'head': {'rot': turn('head', X, 0.03 * breath) @ turn('head', Z, 0.05 * math.sin(t * TAU * 0.5))},
            'eyes': {'scale': (1, blink, 1)},
            'arm.L': {'rot': turn('arm.L', Y, 0.04 * breath)}, 'arm.R': {'rot': turn('arm.R', Y, -0.04 * breath)}, **cloth(t, 'idle')}


def walk(t):
    swing, bob = math.sin(t * TAU), abs(math.sin(t * TAU))
    return {'hips': {'loc': (0, 0.03 * bob, 0)},
            'spine': {'rot': turn('spine', Z, 0.09 * swing) @ turn('spine', X, -0.05)},
            'head': {'rot': turn('head', Z, -0.07 * swing) @ turn('head', Y, 0.03 * swing)},
            'leg.L': {'rot': turn('leg.L', X, 0.50 * swing)}, 'leg.R': {'rot': turn('leg.R', X, -0.50 * swing)},
            'arm.L': {'rot': turn('arm.L', X, -0.42 * swing)}, 'arm.R': {'rot': turn('arm.R', X, 0.42 * swing)}, **cloth(t, 'walk')}


def spin(t):   # xoay mot vong tai cho: vay xoe, khan va no tre lai
    ease = t * t * (3 - 2 * t)
    return {'root': {'rot': turn('root', Z, ease * TAU)},
            'arm.L': {'rot': turn('arm.L', Y, -0.35 * math.sin(math.pi * t))}, 'arm.R': {'rot': turn('arm.R', Y, 0.35 * math.sin(math.pi * t))}, **cloth(t, 'turn')}


b.animate({'Idle': (idle, 2.0), 'Walk': (walk, 1.0), 'Turn': (spin, 1.5)})
# buoc 8: canh duyet co dinh
b.review(REVIEW_DIR, [('Idle', 1, 'truoc'), ('Idle', 32, 'truoc'), ('Idle', 1, 'sau'), ('Walk', 7, 'ngang'), ('Walk', 19, 'ngang'), ('Walk', 7, 'sau'), ('Turn', 14, 'truoc'), ('Turn', 22, 'truoc')])
b.export(GLB_PATH)
