# Hoang tu ban 2: cao khoang bon dau, tay chan co khuyu va goi, ban tay co ngon, mat co mong va mi, toc xoan tung lon,
# ao tunic co ta xoe, quan rong bo gau, giay bot, khan quang hai duoi co chuoi xuong rieng. Dung bang kit2.py + nguoi_chung.py.
# Chay:  blender -b -P tools/blender/hoang_tu.py -- <thu muc anh duyet> <duong dan .glb>
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit2 import Sculpt, X, Y, Z   # noqa: E402
from nguoi_chung import FACE_COLORS, SIDES, TAU, add_face, add_hand, add_head, body_bones, body_motion, lock   # noqa: E402

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
REVIEW_DIR = argv[0] if argv else 'review'
GLB_PATH = argv[1] if len(argv) > 1 else 'hoang-tu.glb'
SCARF_A = [f'scarfA.{i}' for i in range(1, 6)]
SCARF_B = [f'scarfB.{i}' for i in range(1, 4)]

COLORS = {'da': (1.0, 0.80, 0.68), 'toc': (0.40, 0.23, 0.13), 'ao': (0.27, 0.44, 0.29), 'quan': (0.24, 0.40, 0.26), 'nau': (0.56, 0.34, 0.20),
          'vang': (0.80, 0.62, 0.25), 'khan': (0.72, 0.27, 0.20), 'mong': (0.38, 0.23, 0.12), **FACE_COLORS}
BONES = body_bones()
for i, name in enumerate(SCARF_A):
    BONES[name] = ((0.045 + 0.004 * i, 0.058 + 0.022 * i, 0.735 - 0.058 * i), (0.049 + 0.004 * i, 0.080 + 0.022 * i, 0.677 - 0.058 * i), SCARF_A[i - 1] if i else 'chest')
for i, name in enumerate(SCARF_B):
    BONES[name] = ((0.018 - 0.004 * i, 0.062 + 0.02 * i, 0.735 - 0.05 * i), (0.014 - 0.004 * i, 0.082 + 0.02 * i, 0.685 - 0.05 * i), SCARF_B[i - 1] if i else 'chest')

s = Sculpt('HoangTu', COLORS, BONES)
add_head(s)
add_face(s)

# ------------------------------------------------------------------ toc xoan: mu toc + lon to nho, dai ngan xen ke, them lop ngoai cho phong
s.layer('toc', 'toc', 'head', voxel=0.005, smooth=2, keep=0.5)
s.ball((0, 0.016, 0.908), (0.116, 0.117, 0.103), 24)
for i in range(22):
    a = math.radians(42 + i * (276 / 21))
    back = (1 - math.cos(a)) / 2
    lock(s, a, 0.20 + 0.10 * (i % 3), 1.42 + 0.50 * back + 0.14 * ((i * 5) % 3) / 2, 0.42 * (1 if i % 2 else -1), 0.038 + 0.008 * (i % 2), 0.10 + 0.12 * ((i * 7) % 4) / 3)
for i in range(14):
    lock(s, math.radians(30 + i * (300 / 13) + 9), 0.35, 1.05 + 0.25 * ((i * 3) % 4) / 3, 0.6 * (1 if i % 2 else -1), 0.034, 0.22, puff=1.10)
for i in range(7):                                                                     # mai truoc chai lech, de lo tran va long may
    lock(s, math.radians(-48 + i * 16), 0.16, 0.74 + 0.10 * ((i * 3) % 4) / 3, 0.60 if i < 4 else -0.40, 0.034, 0.10, puff=1.06)
for i in range(5): lock(s, i * 1.3 + 0.4, 0.02, 0.60, 1.0, 0.040, 0.20, puff=1.08)

# ------------------------------------------------------------------ ao tunic: than nung lien, ta ao xoe, tay ao rieng de co duong may vai
s.layer('ao', 'ao', ['hips', 'spine', 'chest'], voxel=0.007, smooth=6, wrinkle=0.004, keep=0.3)
s.ball((0, 0, 0.655), (0.098, 0.066, 0.082)); s.ball((0, 0, 0.585), (0.090, 0.062, 0.060))
for sx in (-1, 1): s.ball((sx * 0.086, 0, 0.700), (0.042, 0.048, 0.040), 14)
s.solid([(0.60, 0.086, 0.060), (0.555, 0.090, 0.062), (0.50, 0.112, 0.080), (0.44, 0.136, 0.098), (0.395, 0.152, 0.108), (0.385, 0.146, 0.104)], pleats=8, depth=0.07)
s.band((0, 0.002, 0.742), 0.047, 0.047, 0.013)
for sx, S in SIDES:
    s.layer(f'tayao{S}', 'ao', ['chest', f'upperarm.{S}', f'forearm.{S}'], voxel=0.007, smooth=5, wrinkle=0.0035, keep=0.3)
    s.tube([(0.092 * sx, 0, 0.708), (0.125 * sx, 0.003, 0.640), (0.150 * sx, 0.005, 0.565), (0.164 * sx, -0.004, 0.500), (0.171 * sx, -0.010, 0.452)], [0.046, 0.043, 0.040, 0.040, 0.043])
    s.tube([(0.170 * sx, -0.009, 0.462), (0.172 * sx, -0.011, 0.447)], [0.047, 0.047])
    add_hand(s, sx, S)
s.layer('nut', 'quan', 'chest', voxel=0)
for z, y in ((0.705, -0.058), (0.668, -0.066), (0.630, -0.067)): s.ball((0, y, z), (0.008, 0.004, 0.008), 10)
s.layer('thatlung', 'nau', 'hips', voxel=0); s.band((0, 0, 0.553), 0.094, 0.066, 0.011, 1.4)
s.layer('khoa', 'vang', 'hips', voxel=0); s.ball((0, -0.079, 0.553), (0.017, 0.006, 0.015), 12)

# ------------------------------------------------------------------ quan rong bo gau: moi ong mot lop rieng de khi buoc khong keo mang giua hai chan
s.layer('dung', 'quan', 'hips', voxel=0.007, smooth=6, keep=0.3); s.ball((0, 0, 0.462), (0.094, 0.070, 0.046))
for sx, S in SIDES:
    s.layer(f'ongquan{S}', 'quan', ['hips', f'thigh.{S}', f'shin.{S}'], voxel=0.007, smooth=6, wrinkle=0.005, keep=0.3)
    s.tube([(0.052 * sx, 0, 0.455), (0.060 * sx, -0.004, 0.360), (0.063 * sx, -0.004, 0.275), (0.065 * sx, 0, 0.190), (0.065 * sx, 0.002, 0.128)], [0.060, 0.063, 0.066, 0.070, 0.058])
    s.layer(f'giay{S}', 'nau', [f'shin.{S}', f'foot.{S}'], voxel=0.006, smooth=5, keep=0.35)
    s.tube([(0.064 * sx, 0.004, 0.130), (0.064 * sx, 0.004, 0.045)], [0.047, 0.045])
    s.ball((0.064 * sx, 0.004, 0.130), (0.052, 0.052, 0.014), 14)
    s.ball((0.064 * sx, -0.035, 0.030), (0.043, 0.078, 0.030), 16); s.ball((0.064 * sx, -0.085, 0.027), (0.038, 0.040, 0.027), 14); s.ball((0.064 * sx, 0.030, 0.024), (0.036, 0.030, 0.024), 12)

# ------------------------------------------------------------------ khan: quan quanh co, nut that sau vai, hai duoi co chuoi xuong
s.layer('khan', 'khan', ['neck', 'chest'], voxel=0.006, smooth=4, wrinkle=0.003, keep=0.4)
s.band((0, 0.002, 0.754), 0.056, 0.058, 0.022, 0.9); s.band((0, 0.004, 0.737), 0.062, 0.064, 0.019, 0.9)
s.ball((0.036, 0.058, 0.742), (0.024, 0.022, 0.022), 12)
s.layer('duoiA', 'khan', SCARF_A, voxel=0, power=3.0); s.strip(SCARF_A, 0.034, 0.005, fold=0.22)
s.layer('duoiB', 'khan', SCARF_B, voxel=0, power=3.0); s.strip(SCARF_B, 0.028, 0.005, fold=0.22)

s.build()
turn = s.turn
idle, walk, spin = body_motion(turn)


def cloth(t, mode):
    """Hai duoi khan: cung song voi than nhung tre dan theo tung dot; khi xoay thi bi bo lai phia sau."""
    pose, flare = {}, math.sin(math.pi * t) if mode == 'turn' else 0.0
    for chain, amp in ((SCARF_A, 1.0), (SCARF_B, 0.8)):
        for i, name in enumerate(chain):
            lag = 0.7 * (i + 1)
            if mode == 'idle': q = turn(name, X, 0.035 * math.sin(t * TAU - lag)) @ turn(name, Y, 0.05 * math.sin(t * TAU * 0.5 - lag))
            elif mode == 'walk': q = turn(name, X, amp * (0.14 + 0.06 * i + 0.08 * math.sin(2 * t * TAU - lag))) @ turn(name, Z, 0.12 * math.sin(t * TAU - lag))
            else: q = turn(name, Z, -0.20 * flare * (1 + 0.3 * i)) @ turn(name, X, 0.2 * flare)
            pose[name] = {'rot': q}
    return pose


s.animate({'Idle': (lambda t: {**idle(t), **cloth(t, 'idle')}, 2.0), 'Walk': (lambda t: {**walk(t), **cloth(t, 'walk')}, 1.0), 'Turn': (lambda t: {**spin(t), **cloth(t, 'turn')}, 1.5)})
s.review(REVIEW_DIR, [('Idle', 1, 'truoc'), ('Idle', 1, 'mat'), ('Idle', 1, 'sau'), ('Walk', 1, 'ngang'), ('Walk', 7, 'ngang'), ('Walk', 13, 'ngang'), ('Walk', 7, 'truoc'), ('Turn', 16, 'truoc')])
s.export(GLB_PATH)
