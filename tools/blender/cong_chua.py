# Cong chua ban 2: mu trang rong vanh, toc bob, vay den hoa trang hinh chuong co nep gap, tay phong, dai trang voi no va hai day no
# sau lung, tat va bot trang. Vay co 8 chuoi xuong, day no co 2 chuoi. Dung bang kit2.py + nguoi_chung.py.
# Chay:  blender -b -P tools/blender/cong_chua.py -- <thu muc anh duyet> <duong dan .glb>
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mathutils import Vector   # noqa: E402
from kit2 import Sculpt, X, Y, Z   # noqa: E402
from nguoi_chung import FACE_COLORS, SIDES, TAU, add_face, add_hand, add_head, body_bones, body_motion, lock   # noqa: E402

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
REVIEW_DIR = argv[0] if argv else 'review'
GLB_PATH = argv[1] if len(argv) > 1 else 'cong-chua.glb'
CHAINS, SKIRT_TOP, SKIRT_HEM = 8, 0.555, 0.215
SKIRT_RINGS = [(0.555, 0.070, 0.052), (0.52, 0.095, 0.078), (0.46, 0.135, 0.120), (0.39, 0.175, 0.165), (0.31, 0.215, 0.208), (0.24, 0.245, 0.240), (0.215, 0.252, 0.248)]
BOW = {S: [f'bow.{S}.{j}' for j in (1, 2, 3)] for _, S in SIDES}

COLORS = {'da': (1.0, 0.84, 0.76), 'toc': (0.17, 0.12, 0.11), 'vay': (0.11, 0.10, 0.12), 'giay': (0.92, 0.92, 0.95), 'xam': (0.56, 0.54, 0.57),
          'nhuy': (0.80, 0.72, 0.45), 'mong': (0.32, 0.18, 0.12), **FACE_COLORS}
BONES = body_bones()
for k in range(CHAINS):
    c, sn = math.cos(k / CHAINS * TAU), math.sin(k / CHAINS * TAU)
    BONES[f'skirt.{k}.1'] = ((0.09 * c, 0.08 * sn, 0.54), (0.17 * c, 0.16 * sn, 0.39), 'hips')
    BONES[f'skirt.{k}.2'] = ((0.17 * c, 0.16 * sn, 0.39), (0.25 * c, 0.245 * sn, 0.22), f'skirt.{k}.1')
for sx, S in SIDES:
    for j, name in enumerate(BOW[S]):
        BONES[name] = ((sx * (0.015 + 0.010 * j), 0.072 + 0.056 * j, 0.550 - 0.085 * j), (sx * (0.025 + 0.010 * j), 0.128 + 0.056 * j, 0.465 - 0.085 * j), BOW[S][j - 1] if j else 'hips')


def skirt_weights(co):
    """Gan eo theo hong; xuong duoi chia cho hai chuoi gan nhat theo goc va hai dot theo chieu cao."""
    t = min(max((SKIRT_TOP - co.z) / (SKIRT_TOP - SKIRT_HEM), 0.0), 1.0)
    turn_ = (math.atan2(co.y, co.x) / TAU) % 1.0 * CHAINS
    k0, frac = int(turn_) % CHAINS, turn_ - int(turn_)
    top, low = max(0.0, 1.0 - t / 0.18), min(max((t - 0.35) / 0.4, 0.0), 1.0)
    table = {'hips': top}
    for k, share in ((k0, 1 - frac), ((k0 + 1) % CHAINS, frac)):
        table[f'skirt.{k}.1'] = (1 - top) * (1 - low) * share
        table[f'skirt.{k}.2'] = (1 - top) * low * share
    return {name: w for name, w in table.items() if w > 0.001}


def skirt_point(a, z):
    """Diem tren mat vay tai goc a, do cao z, kem phap tuyen huong ra ngoai."""
    for (z0, rx0, ry0), (z1, rx1, ry1) in zip(SKIRT_RINGS, SKIRT_RINGS[1:]):
        if z1 <= z <= z0:
            u = (z0 - z) / (z0 - z1)
            rx, ry, slope = rx0 + (rx1 - rx0) * u, ry0 + (ry1 - ry0) * u, (rx1 - rx0) / (z0 - z1)
            return Vector((rx * math.cos(a), ry * math.sin(a), z)), Vector((math.cos(a), math.sin(a), slope)).normalized()
    raise ValueError(z)


s = Sculpt('CongChua', COLORS, BONES)
add_head(s)
add_face(s, lash=0.0036)


def flower(centre, normal, size, weights):
    """Bong hoa nam ap tren be mat: nam canh det va mot nhuy."""
    face = Vector((0, 1, 0)).rotation_difference(normal)
    u = normal.cross(Vector((0, 0, 1))).normalized()
    v = normal.cross(u)
    s.layer('hoa', 'trang', weights, voxel=0)
    for p in range(5):
        g = p / 5 * TAU + 0.3
        s.ball(centre + (u * math.cos(g) + v * math.sin(g)) * size + normal * 0.0025, (size * 0.78, 0.0035, size * 0.78), 10, rot=face)
    s.layer('nhuy', 'nhuy', weights, voxel=0)
    s.ball(centre + normal * 0.004, (size * 0.36, 0.004, size * 0.36), 8, rot=face)


# ------------------------------------------------------------------ toc bob: mu toc, khoi toc om gay, mai bang va hai lon om ma
s.layer('toc', 'toc', 'head', voxel=0.005, smooth=3, keep=0.45)
s.ball((0, 0.016, 0.908), (0.116, 0.117, 0.103), 24)
s.ball((0, 0.030, 0.860), (0.127, 0.116, 0.085), 24)
for i in range(9): lock(s, math.radians(-60 + i * 15), 0.15, 0.84 + 0.05 * (i % 2), 0.12 * (1 if i % 2 else -1), 0.034, 0.0, puff=1.05)
for a in (-88, -72, 72, 88): lock(s, math.radians(a), 0.30, 1.60, 0.0, 0.037, -0.03, puff=1.05, drop=0.05)
for i in range(8): lock(s, math.radians(108 + i * 20.5), 0.30, 1.75, 0.10 * (1 if i % 2 else -1), 0.036, -0.02, puff=1.05, drop=0.04)

# ------------------------------------------------------------------ mu rong vanh: vanh co be day va chop mu nung lien, dai mu xam
s.layer('mu', 'trang', 'head', voxel=0.006, smooth=4, keep=0.4)
s.solid([(0.984, 0.14, 0.14), (0.978, 0.22, 0.22), (0.964, 0.29, 0.29), (0.948, 0.335, 0.335), (0.940, 0.30, 0.30), (0.952, 0.22, 0.22), (0.960, 0.14, 0.14)], nu=56)   # vanh hoi cup xuong
s.ball((0, 0.005, 0.985), (0.142, 0.142, 0.078), 28)
s.layer('daimu', 'xam', 'head', voxel=0); s.band((0, 0.005, 0.976), 0.143, 0.143, 0.011, 1.7)

# ------------------------------------------------------------------ vay: than ao nung lien, tay phong, chan vay hinh chuong co nep (giu luoi tham so de nep sac)
s.layer('thanao', 'vay', ['hips', 'spine', 'chest'], voxel=0.006, smooth=5, wrinkle=0.003, keep=0.35)
s.ball((0, 0, 0.655), (0.084, 0.060, 0.078)); s.ball((0, 0, 0.590), (0.072, 0.052, 0.055))
for sx in (-1, 1): s.ball((sx * 0.070, 0, 0.705), (0.035, 0.040, 0.030), 12)
s.layer('chanvay', 'vay', skirt_weights, voxel=0); s.solid(SKIRT_RINGS, nu=96, pleats=12, depth=0.045)
for i in range(16):                                                                    # hoa in tren chan vay
    a, z = (i * 0.618 + 0.1) % 1.0 * TAU, 0.47 - 0.21 * ((i * 7) % 9) / 8
    centre, normal = skirt_point(a, z)
    flower(centre + normal * 0.004, normal, 0.020 + 0.006 * (i % 3), skirt_weights)
for x, z in ((-0.036, 0.672), (0.040, 0.640), (-0.010, 0.612), (0.058, 0.690)):       # vai bong nho tren than ao
    y = -0.060 * math.sqrt(max(0.05, 1 - (x / 0.084) ** 2 - ((z - 0.655) / 0.078) ** 2))
    flower(Vector((x, y - 0.003, z)), Vector((x * 3, -1, 0)).normalized(), 0.011, 'chest')
s.layer('dai', 'trang', 'hips', voxel=0); s.band((0, 0, 0.556), 0.074, 0.056, 0.013, 1.5)
s.layer('no', 'trang', 'hips', voxel=0.005, smooth=3, keep=0.5)
s.ball((0, 0.066, 0.556), (0.016, 0.014, 0.016), 12)
for sx in (-1, 1): s.ball((sx * 0.042, 0.074, 0.566), (0.036, 0.013, 0.025), 14)
for sx, S in SIDES:
    s.layer(f'dayno{S}', 'trang', BOW[S], voxel=0, power=3.0); s.strip(BOW[S], 0.020, 0.004, fold=0.2)
    s.layer(f'tayphong{S}', 'vay', ['chest', f'upperarm.{S}'], voxel=0.006, smooth=5, wrinkle=0.003, keep=0.35)
    s.ball((0.105 * sx, 0, 0.693), (0.048, 0.046, 0.042), 16)
    s.layer(f'canhtay{S}', 'da', ['chest', f'upperarm.{S}', f'forearm.{S}'], voxel=0.005, smooth=5, keep=0.4)
    s.tube([(0.100 * sx, 0, 0.700), (0.128 * sx, 0.003, 0.630), (0.150 * sx, 0.005, 0.565), (0.163 * sx, -0.004, 0.500), (0.170 * sx, -0.010, 0.452)], [0.024, 0.022, 0.020, 0.019, 0.0175])
    add_hand(s, sx, S)
    # tat trang va bot trang
    s.layer(f'tat{S}', 'trang', ['hips', f'thigh.{S}', f'shin.{S}'], voxel=0.006, smooth=5, keep=0.35)
    s.tube([(0.050 * sx, 0, 0.47), (0.058 * sx, -0.004, 0.275), (0.062 * sx, 0.002, 0.12)], [0.036, 0.030, 0.026])
    s.layer(f'bot{S}', 'giay', [f'shin.{S}', f'foot.{S}'], voxel=0.006, smooth=5, keep=0.35)
    s.tube([(0.063 * sx, 0.003, 0.150), (0.064 * sx, 0.004, 0.045)], [0.036, 0.038])
    s.ball((0.064 * sx, -0.030, 0.028), (0.037, 0.066, 0.028), 16); s.ball((0.064 * sx, -0.072, 0.025), (0.033, 0.036, 0.025), 14); s.ball((0.064 * sx, 0.026, 0.023), (0.032, 0.028, 0.023), 12)

s.build()
turn = s.turn
idle, walk, spin = body_motion(turn)


def cloth(t, mode):
    """Vay va day no: di thi phan sau bay ra va lac tre theo buoc chan; xoay thi vay xoe, day no bi bo lai."""
    pose, flare = {}, math.sin(math.pi * t) if mode == 'turn' else 0.0
    for k in range(CHAINS):
        a = k / CHAINS * TAU
        tangent, back = (-math.sin(a), math.cos(a), 0.0), max(0.0, math.sin(a))
        for j in (1, 2):
            lag = 0.5 * j + 0.4 * k
            if mode == 'idle': out = 0.02 * math.sin(t * TAU - lag)
            elif mode == 'walk': out = 0.09 * back + 0.06 * math.sin(2 * t * TAU - lag) + 0.05 * math.sin(t * TAU + a - lag)
            else: out = flare * (0.26 if j == 1 else 0.15)
            twist = -0.15 * flare * j if mode == 'turn' else 0.0
            pose[f'skirt.{k}.{j}'] = {'rot': turn(f'skirt.{k}.{j}', Z, twist) @ turn(f'skirt.{k}.{j}', tangent, -out)}   # goc am la xoe ra ngoai
    for _, S in SIDES:
        for j, name in enumerate(BOW[S]):
            lag = 0.8 * (j + 1)
            if mode == 'idle': q = turn(name, X, 0.03 * math.sin(t * TAU - lag))
            elif mode == 'walk': q = turn(name, X, 0.14 + 0.08 * j + 0.09 * math.sin(2 * t * TAU - lag)) @ turn(name, Z, 0.10 * math.sin(t * TAU - lag))
            else: q = turn(name, Z, -0.25 * flare * (j + 1)) @ turn(name, X, 0.25 * flare)
            pose[name] = {'rot': q}
    return pose


s.animate({'Idle': (lambda t: {**idle(t), **cloth(t, 'idle')}, 2.0), 'Walk': (lambda t: {**walk(t), **cloth(t, 'walk')}, 1.0), 'Turn': (lambda t: {**spin(t), **cloth(t, 'turn')}, 1.5)})
s.review(REVIEW_DIR, [('Idle', 1, 'truoc'), ('Idle', 1, 'mat'), ('Idle', 1, 'sau'), ('Walk', 1, 'ngang'), ('Walk', 7, 'ngang'), ('Walk', 13, 'ngang'), ('Walk', 7, 'truoc'), ('Turn', 16, 'truoc')])
s.export(GLB_PATH)
