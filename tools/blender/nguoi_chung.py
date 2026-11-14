# Phan dung chung cho nhan vat nguoi ban 2 (kit2.py): bo xuong than, dau va khuon mat, ban tay, va chuyen dong than nguoi.
# Moi nhan vat (hoang_tu.py, cong_chua.py) chi them toc, quan ao va cac chuoi xuong vai cua rieng minh.
import math
from kit2 import X, Y, Z

TAU = math.tau
HEAD_BALLS = [((0, 0, 0.880), (0.114, 0.113, 0.118)), ((0, -0.012, 0.815), (0.086, 0.088, 0.058)),
              ((0.058, -0.040, 0.832), (0.043, 0.042, 0.040)), ((-0.058, -0.040, 0.832), (0.043, 0.042, 0.040))]
HAIR_C, HAIR_R = (0, 0.012, 0.902), (0.120, 0.122, 0.116)
EYE = {'x': 0.045, 'z': 0.874, 'rx': 0.027, 'rz': 0.032}
SIDES = ((1, 'L'), (-1, 'R'))
FACE_COLORS = {'trang': (0.99, 0.98, 0.96), 'den': (0.10, 0.07, 0.08), 'moi': (0.74, 0.37, 0.34), 'hong': (0.99, 0.68, 0.63)}


def body_bones():
    bones = {
        'root': ((0, 0, 0), (0, 0, 0.08), None),
        'hips': ((0, 0, 0.47), (0, 0, 0.56), 'root'), 'spine': ((0, 0, 0.56), (0, 0, 0.66), 'hips'), 'chest': ((0, 0, 0.66), (0, 0, 0.735), 'spine'),
        'neck': ((0, 0, 0.735), (0, 0, 0.775), 'chest'), 'head': ((0, 0, 0.775), (0, 0, 1.0), 'neck'),
        'eyes': ((0, -0.10, EYE['z']), (0, -0.10, EYE['z'] + 0.056), 'head'),
    }
    for sx, S in SIDES:
        bones[f'upperarm.{S}'] = ((0.108 * sx, 0, 0.705), (0.150 * sx, 0.005, 0.565), 'chest')
        bones[f'forearm.{S}'] = ((0.150 * sx, 0.005, 0.565), (0.172 * sx, -0.012, 0.44), f'upperarm.{S}')
        bones[f'hand.{S}'] = ((0.172 * sx, -0.012, 0.44), (0.180 * sx, -0.02, 0.375), f'forearm.{S}')
        bones[f'thigh.{S}'] = ((0.055 * sx, 0, 0.47), (0.062 * sx, -0.004, 0.275), 'hips')
        bones[f'shin.{S}'] = ((0.062 * sx, -0.004, 0.275), (0.064 * sx, 0.004, 0.075), f'thigh.{S}')
        bones[f'foot.{S}'] = ((0.064 * sx, 0.004, 0.075), (0.064 * sx, -0.10, 0.02), f'shin.{S}')
    return bones


def face_y(x, z, out=0.0):
    """Toa do y cua mat truoc khuon mat tai (x, z), cong them `out` de chi tiet nho ra khoi mat."""
    best = 0.0
    for (cx, cy, cz), (rx, ry, rz) in HEAD_BALLS:
        k = 1 - ((x - cx) / rx) ** 2 - ((z - cz) / rz) ** 2
        if k > 0: best = min(best, cy - ry * math.sqrt(k))
    return best - out


def add_head(s, skin='da'):
    """Dau, ham, ma, mui, tai nung thanh mot khoi; co la lop rieng de uon theo xuong co."""
    s.layer('dau', skin, 'head', voxel=0.005, smooth=8, keep=0.3)
    for centre, radii in HEAD_BALLS: s.ball(centre, radii, 28)
    s.ball((0, face_y(0, 0.846) + 0.005, 0.846), (0.010, 0.011, 0.009), 12)
    for sx in (-1, 1): s.ball((sx * 0.113, 0.008, 0.866), (0.015, 0.022, 0.030), 12)
    s.layer('co', skin, ['neck', 'chest'], voxel=0.006, keep=0.5)
    s.tube([(0, 0.004, 0.715), (0, 0.002, 0.80)], [0.037, 0.036])


def add_face(s, iris='mong', brow='toc', lash=0.0030):
    """Mat (long trang, mong, dong tu, dom sang), hang mi tren om vanh mat, long may, ma hong, mieng cuoi. Khong nung: giu net sac."""
    for sx in (-1, 1):
        ex, ez = sx * EYE['x'], EYE['z']
        s.layer(f'longtrang{sx}', 'trang', 'eyes', voxel=0); s.ball((ex, face_y(ex, ez, -0.004), ez), (EYE['rx'], 0.008, EYE['rz']), 20)
        s.layer(f'mong{sx}', iris, 'eyes', voxel=0); s.ball((ex - sx * 0.003, face_y(ex, ez, 0.001), ez - 0.003), (0.0175, 0.005, 0.0215), 18)
        s.layer(f'dongtu{sx}', 'den', 'eyes', voxel=0); s.ball((ex - sx * 0.003, face_y(ex, ez, 0.004), ez - 0.003), (0.0085, 0.003, 0.0115), 12)
        s.layer(f'domsang{sx}', 'trang', 'eyes', voxel=0); s.ball((ex - sx * 0.003 + 0.007, face_y(ex, ez, 0.0065), ez + 0.006), (0.005, 0.002, 0.005), 8)
        s.layer(f'mi{sx}', 'den', 'eyes', voxel=0)
        arc = [math.radians(d) for d in (168, 135, 90, 45, 8)]
        s.tube([(ex - sx * math.cos(g) * (EYE['rx'] + 0.001), face_y(ex - sx * math.cos(g) * EYE['rx'], ez + math.sin(g) * EYE['rz'], 0.003), ez + math.sin(g) * (EYE['rz'] + 0.001)) for g in arc],
               [lash * 0.6, lash * 0.87, lash, lash, lash * 0.67], 8)
        s.layer(f'may{sx}', brow, 'head', voxel=0)
        s.tube([(ex + sx * dx, face_y(ex + sx * dx, ez + dz, 0.002), ez + dz) for dx, dz in ((-0.020, 0.050), (0.000, 0.056), (0.024, 0.049))], [0.0030, 0.0036, 0.0022], 8)
        s.layer(f'ma{sx}', 'hong', 'head', voxel=0); s.ball((sx * 0.072, face_y(sx * 0.072, 0.836, -0.003), 0.836), (0.018, 0.006, 0.011), 12)
    s.layer('mieng', 'moi', 'head', voxel=0)
    s.tube([(dx, face_y(dx, 0.810 + dz, 0.001), 0.810 + dz) for dx, dz in ((-0.024, 0.005), (-0.010, -0.002), (0.010, -0.002), (0.024, 0.005))], [0.0016, 0.0026, 0.0026, 0.0016], 8)


def add_hand(s, sx, S, skin='da'):
    """Co tay, long ban tay, bon ngon hoi khum va ngon cai."""
    s.layer(f'tay{S}', skin, [f'hand.{S}', f'forearm.{S}'], voxel=0.0035, smooth=4, keep=0.5)
    s.tube([(0.169 * sx, -0.008, 0.455), (0.175 * sx, -0.015, 0.422)], [0.017, 0.016])
    s.ball((0.177 * sx, -0.018, 0.402), (0.013, 0.026, 0.030), 14)
    for f in range(4):
        y = -0.039 + f * 0.0125
        s.tube([(0.177 * sx, y, 0.385), (0.176 * sx, y - 0.002, 0.362), (0.172 * sx, y - 0.003, 0.345 + 0.004 * abs(f - 1.5))], [0.0072, 0.0068, 0.0058], 8)
    s.tube([(0.172 * sx, -0.038, 0.412), (0.168 * sx, -0.052, 0.392), (0.166 * sx, -0.055, 0.374)], [0.0085, 0.0078, 0.0065], 8)


def lock(s, a, th0, th1, swirl, r0, lift, puff=1.03, n=6, drop=0.0):
    """Mot lon toc chay theo da dau tu goc th0 toi th1 (tinh tu dinh dau), xoay `swirl`, dau lon venh `lift`; drop keo lon thang xuong them."""
    pts, radii = [], []
    for k in range(n):
        u = k / (n - 1)
        th, az, grow = th0 + (th1 - th0) * u, a + swirl * u, puff + lift * u ** 3
        pts.append((HAIR_C[0] + HAIR_R[0] * math.sin(th) * math.sin(az) * grow, HAIR_C[1] - HAIR_R[1] * math.sin(th) * math.cos(az) * grow,
                    HAIR_C[2] + HAIR_R[2] * math.cos(th) * grow - drop * u * u))
        radii.append(r0 * (1 - 0.55 * u))
    s.tube(pts, radii, 8)


def body_motion(turn):
    """Tra ve ba ham tu the cua than nguoi (chua co vai): idle(t), walk(t), spin(t)."""
    def idle(t):
        breath, blink = math.sin(t * TAU), 0.1 if 0.62 < t < 0.68 else 1.0
        pose = {'chest': {'scale': (1 + 0.012 * breath, 1 + 0.02 * breath, 1 + 0.01 * breath)},
                'head': {'rot': turn('head', X, 0.025 * breath) @ turn('head', Z, 0.05 * math.sin(t * TAU * 0.5))},
                'eyes': {'scale': (1, blink, 1)}}
        for sx, S in SIDES:
            pose[f'upperarm.{S}'] = {'rot': turn(f'upperarm.{S}', Y, sx * 0.03 * breath)}
            pose[f'forearm.{S}'] = {'rot': turn(f'forearm.{S}', X, -0.12)}
        return pose

    def walk(t):
        phase = t * TAU
        pose = {'hips': {'loc': (0, 0.010 * math.cos(2 * phase), 0), 'rot': turn('hips', Z, 0.06 * math.sin(phase))},
                'chest': {'rot': turn('chest', Z, -0.13 * math.sin(phase)) @ turn('chest', X, -0.04)},
                'head': {'rot': turn('head', Z, 0.06 * math.sin(phase))}}
        for S, p in (('L', phase), ('R', phase + math.pi)):
            pose[f'thigh.{S}'] = {'rot': turn(f'thigh.{S}', X, -0.50 * math.sin(p))}                     # goc am la dua chan ra truoc
            pose[f'shin.{S}'] = {'rot': turn(f'shin.{S}', X, 0.08 + 0.75 * max(0.0, math.cos(p)))}      # gap goi khi chan dang vuot len
            pose[f'foot.{S}'] = {'rot': turn(f'foot.{S}', X, -0.18 * math.sin(p))}
            pose[f'upperarm.{S}'] = {'rot': turn(f'upperarm.{S}', X, 0.42 * math.sin(p))}                 # tay nguoc pha voi chan cung ben
            pose[f'forearm.{S}'] = {'rot': turn(f'forearm.{S}', X, -(0.30 - 0.18 * math.sin(p)))}
        return pose

    def spin(t):
        ease = t * t * (3 - 2 * t)
        return {'root': {'rot': turn('root', Z, ease * TAU)}}
    return idle, walk, spin


def air_motion(turn):
    """Hai tu the tren khong (lap lai, chi rung nhe): jump(t) co chan, tay gio ngang; glide(t) dang rong tay, chan duoi ra sau.
    Truc quay la truc the gioi: nhan vat nhin ve -Y, ben L o +X. Quanh Y goc am thi tay ben +X gio len; quanh X goc am thi dua ra truoc."""
    def jump(t):
        flutter = math.sin(t * TAU)
        pose = {'chest': {'rot': turn('chest', X, -0.06)}, 'head': {'rot': turn('head', X, -0.10)}}
        for (sx, S), lift, bend in zip(SIDES, (-0.70, -0.15), (1.05, 0.55)):                                # chan trai co cao, chan phai tha long
            pose[f'thigh.{S}'] = {'rot': turn(f'thigh.{S}', X, lift + 0.04 * flutter)}
            pose[f'shin.{S}'] = {'rot': turn(f'shin.{S}', X, bend)}
            pose[f'upperarm.{S}'] = {'rot': turn(f'upperarm.{S}', Y, -sx * (0.75 + 0.06 * flutter))}
            pose[f'forearm.{S}'] = {'rot': turn(f'forearm.{S}', X, -0.25)}
        return pose

    def glide(t):
        flutter = math.sin(t * TAU)
        pose = {'chest': {'rot': turn('chest', X, 0.10)}, 'head': {'rot': turn('head', X, -0.28)},
                'hips': {'rot': turn('hips', Z, 0.03 * flutter)}}
        for (sx, S), lag in zip(SIDES, (0.0, 0.9)):
            pose[f'thigh.{S}'] = {'rot': turn(f'thigh.{S}', X, 0.38 + 0.05 * math.sin(t * TAU + lag))}      # chan duoi ra sau, hai chan lech nhip
            pose[f'shin.{S}'] = {'rot': turn(f'shin.{S}', X, 0.30)}
            pose[f'foot.{S}'] = {'rot': turn(f'foot.{S}', X, 0.35)}
            pose[f'upperarm.{S}'] = {'rot': turn(f'upperarm.{S}', Y, -sx * (0.95 + 0.05 * flutter))}       # tay dang ngang nhu canh
        return pose
    return jump, glide
