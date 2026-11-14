# Dung nhan vat TU ANH THIET KE: mot to ba goc nhin toan than (ngang | truoc | sau) va mot to ba goc nhin CAN CANH PHAN DAU,
# ghep thanh mot anh (toan than o tren, dau o duoi). Do hinh bong tung hang diem anh de dung dau, than, tay, chan dung ti le
# va duong vien cua ban ve, roi chieu chinh ban ve len luoi lam hoa tiet. Phan dau dung to can canh nen mat net hon nhieu.
# Chay:  blender -b -P tools/blender/tu_anh.py -- <nhan_vat/ten.json> <thu muc anh duyet> <duong dan .glb>
import json, math, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit2 import Sculpt, X, Y, Z   # noqa: E402
from anh_phan_tich import load, mask_of, runs   # noqa: E402
from nguoi_chung import SIDES, TAU, air_motion, body_motion   # noqa: E402

argv = sys.argv[sys.argv.index('--') + 1:]
CONFIG_PATH, REVIEW_DIR, GLB_PATH = argv[0], argv[1], argv[2]

# ------------------------------------------------------------------ thong so cua tung nhan vat nam trong file .json (xem nhan_vat/*.json)
# Cac so do doc tu anh_phan_tich.py roi dat tay: cot cua tung goc nhin (ti le be ngang), hang cam trong to dau, cac moc chieu cao.
with open(CONFIG_PATH, encoding='utf-8') as handle: CFG = json.load(handle)
NAME = CFG['name']
IMAGE = os.path.join(os.path.dirname(os.path.abspath(CONFIG_PATH)), CFG['image'])
SPLIT = CFG.get('split', 0.5)                     # ti le chieu cao anh ghep: phia tren la to toan than, phia duoi la to dau
BODY_X, HEAD_X, HEAD_CHIN = CFG['body_x'], CFG['head_x'], CFG['head_chin']
Z_CHIN, Z_NECK, Z_ARMPIT, Z_HAND, Z_CROTCH, Z_FOOT = (CFG['z'][k] for k in ('chin', 'neck', 'armpit', 'hand', 'crotch', 'foot'))
BODY_GAP, ENVELOPE, HEAD_ENVELOPE = CFG.get('body_gap', 0.0), CFG.get('envelope', 0), CFG.get('head_envelope', 0)   # va lo thung o mep (hoa trang tren vay trung mau nen): gop doan gan nhau, lay duong bao +-n hang
Z_HIP = CFG['z'].get('hip')                       # khop hang (neu quan, vay che mat phan tren cua chan)
SIDE_FLIP = -1.0 if CFG.get('side_faces') == 'right' else 1.0   # goc ngang trong ban ve quay mat sang phai thi dao chieu truoc sau
ARM_SIDE = CFG.get('arm_side', True)              # False: ca canh tay lay mau tu hinh phia truoc (hinh dung de dung khoi tay nen chac chan khop;
                                                  # o hinh ngang va hinh sau ban tay nam lech, lay vao se dinh mau khe toi giua tay va ao)
MANUAL_LEGS = CFG.get('manual_legs')             # chan dat tay (x, cac vong) khi chan trung mau nen nen khong do duoc hinh bong
DZ, SMOOTH, INSET = 0.0055, 2, 0.94               # buoc lay mau theo chieu cao; lam muot +-2 vong; co anh vao trong de mep khong dinh mau nen
SIDE_FACING, SIDE_FACING_HEAD = 0.62, 0.86        # mat lech sang ngang hon muc nay thi lay anh goc ngang
SCARF = [f'scarf.{i}' for i in range(1, 5)] if CFG.get('scarf') else []

px, W, H = load(IMAGE)
CUT = int(round(H * SPLIT))
mask = np.concatenate([mask_of(px[:CUT])[0], mask_of(px[CUT:])[0]])          # moi to co mau nen rieng


NEAR = ((0, 1), (0, -1), (1, 0), (-1, 0))


def grown(area):
    """Vung `area` no ra mot diem anh theo bon huong."""
    out = area.copy()
    for step in NEAR: out |= np.roll(area, step, axis=(0, 1))
    return out


def padded_texture(path, spread=40, trim=2):
    """To lan mau nhan vat ra ngoai vien `spread` diem anh roi luu thanh anh hoa tiet: mat luoi o sat mep lay mau nhan vat thay vi mau nen."""
    import bpy
    colour = px.copy()
    # Nen that = phan ngoai hinh noi lien voi mep anh. Lo thung ben trong hinh (vung sang trung mau nen: long trang mat, hoa trang)
    # KHONG phai nen: giu nguyen mau goc, khong to de len.
    outside = np.zeros_like(mask); outside[0, :] = outside[-1, :] = outside[:, 0] = outside[:, -1] = True
    outside &= ~mask
    while True:
        more = grown(outside) & ~mask
        if more.sum() == outside.sum(): break
        outside = more
    # Got bo vien khu rang cua sat nen: o do mau nhan vat da pha mau nen, to lan ra se thanh vet sam (ban tay, dinh mu)
    rim = outside
    for _ in range(trim): rim = grown(rim)
    filled = ~rim
    for _ in range(spread):
        total, count = np.zeros_like(colour), np.zeros(filled.shape, dtype=np.float32)
        for dy, dx in NEAR:
            total += np.roll(colour * filled[..., None], (dy, dx), axis=(0, 1)); count += np.roll(filled, (dy, dx), axis=(0, 1))
        grow = (~filled) & (count > 0)
        colour[grow] = total[grow] / count[grow][:, None]
        filled = filled | grow
    out = bpy.data.images.new('hoa-tiet', W, H, alpha=False)
    rgba = np.concatenate([colour[::-1], np.ones((H, W, 1), dtype=np.float32)], axis=2)       # Blender luu hang duoi cung truoc
    out.pixels = rgba.ravel(); out.filepath_raw = path; out.file_format = 'PNG'; out.save()
    return path


TEXTURE = padded_texture(os.path.splitext(os.path.abspath(GLB_PATH))[0] + '-hoa-tiet.png')


class View:
    """Mot goc nhin trong anh: cot diem anh, phep doi hang <-> do cao, truc than."""
    def __init__(self, xs, y0, y1, chin=None, gap=0.0):
        self.x0, self.x1, self.y0, self.y1 = int(xs[0] * W), int(xs[1] * W), y0, y1
        tall = np.flatnonzero(mask[y0:y1, self.x0:self.x1].sum(axis=1) > 6) + y0
        self.top, self.bottom = int(tall[0]), int(tall[-1])
        if chin is None: self.z0, self.row0, self.scale = 0.0, self.bottom, float(self.bottom - self.top)       # toan than: chan = 0, dinh dau = 1
        else: self.z0, self.row0, self.scale = 1.0, self.top, (chin - self.top) / (1.0 - Z_CHIN)                 # to dau: dinh dau = 1, cam = Z_CHIN
        self.axis = (self.x0 + self.x1) / 2
        self.gap = gap * self.scale             # hai doan cach nhau it hon muc nay thi coi la mot (lo thung do vung sang trung mau nen)

    def row(self, z): return int(round(self.row0 - (z - self.z0) * self.scale))

    def runs(self, z):
        y = min(max(self.row(z), self.y0), self.y1 - 1)
        return [(a + self.x0, b + self.x0) for a, b in runs(mask[y, self.x0:self.x1])]

    def main(self, z):
        """Doan chua truc than (hoac gan truc nhat)."""
        found = self.runs(z)
        if not found: return None
        merged = [list(found[0])]
        for a, b in found[1:]:
            if a - merged[-1][1] <= self.gap: merged[-1][1] = b
            else: merged.append([a, b])
        return tuple(min(merged, key=lambda r: 0 if r[0] <= self.axis <= r[1] else min(abs(r[0] - self.axis), abs(r[1] - self.axis))))

    def find_axis(self, z_lo, z_hi):
        mids = [sum(self.main(z)) / 2 for z in np.linspace(z_lo, z_hi, 12) if self.main(z)]
        self.axis = float(np.median(mids))


body = {k: View(BODY_X[k], 0, CUT, gap=BODY_GAP) for k in BODY_X}
head = {k: View(HEAD_X[k], CUT, H, chin=CUT + HEAD_CHIN * (H - CUT), gap=0.05) for k in HEAD_X}   # ma va tai co vung sang gan mau nen: va lo thung
for k in ('front', 'back'): body[k].find_axis(0.42, 0.56)
body['side'].find_axis(0.10, 0.30)
for k in head: head[k].find_axis(Z_CHIN - 0.03, Z_CHIN + 0.01)                  # truc dau lay o co va cam
print('THAN', {k: (round(v.axis), round(v.scale)) for k, v in body.items()}, 'DAU', {k: (round(v.axis), round(v.scale)) for k, v in head.items()})


def views_at(z): return head if z > Z_NECK else body


def env_at(z): return HEAD_ENVELOPE if z > Z_NECK else ENVELOPE


def smooth(rows):
    arr = np.array(rows, dtype=np.float64)
    out = arr.copy()
    for i in range(len(arr)): out[i] = arr[max(0, i - SMOOTH):i + SMOOTH + 1].mean(axis=0)
    out[:, 0] = arr[:, 0]
    return [tuple(r) for r in out]


def depth(z):
    """Tu goc ngang: (tam y, ban kinh y) cua than tai do cao z; mat nhan vat quay ve -Y (ben trai anh). Lay duong bao +-ENVELOPE hang."""
    side = views_at(z)['side']
    near = [side.main(z + k * DZ) for k in range(-env_at(z), env_at(z) + 1) if (z + k * DZ > Z_NECK) == (z > Z_NECK)]   # khong lay hang cua to ben kia
    near = [r for r in near if r]
    if not near: return 0.0, 0.03
    x0, x1 = min(r[0] for r in near), max(r[1] for r in near)
    return SIDE_FLIP * ((x0 + x1) / 2 - side.axis) / side.scale, max((x1 - x0) / 2 / side.scale, 0.012)


def column(z0, z1, pick, round_depth=None):
    """Cac vong (z, cx, cy, rx, ry) tu z0 xuong z1; pick(z) tra ve doan (x0, x1) cua goc truoc; round_depth: tiet dien tron (tay)."""
    found = [(float(z), pick(float(z))) for z in np.arange(z0, z1, -DZ)]
    found = [(z, run) for z, run in found if run]
    if len(found) < 3: raise RuntimeError(f'khong do duoc cot {z0}-{z1}')
    rows = []
    for i, (z, run) in enumerate(found):
        e = env_at(z)
        near = [r for _, r in found[max(0, i - e):i + e + 1]]          # duong bao: mep khong bi khuyet vi mot hang thung
        x0, x1 = min(r[0] for r in near), max(r[1] for r in near)
        front = views_at(z)['front']
        cx, rx = ((x0 + x1) / 2 - front.axis) / front.scale, max((x1 - x0) / 2 / front.scale, 0.006)
        cy, ry = depth(z)
        rows.append((z, cx, cy, rx, rx * round_depth if round_depth is not None else ry))
    return smooth(rows)


def side_runs(z, sign):
    """Gop moi doan nam mot ben than (tay, ngon tay) thanh mot doan. sign = +1 la ben phai anh (tay trai nhan vat)."""
    front = body['front']
    centre = front.main(z)
    found = [r for r in front.runs(z) if centre and ((r[0] > centre[1]) if sign > 0 else (r[1] < centre[0]))]
    found = [r for r in found if abs((r[0] + r[1]) / 2 - front.axis) < 0.30 * front.scale]      # bo bong do va dau ban quyen
    return (min(r[0] for r in found), max(r[1] for r in found)) if found else None


def leg_run(z, sign):
    front = body['front']
    halves = []
    for a, b in [r for r in front.runs(z) if abs((r[0] + r[1]) / 2 - front.axis) < 0.20 * front.scale]:
        if a < front.axis < b: halves += [(a, int(front.axis)), (int(front.axis), b)]             # ong quan cham nhau: cat doi o truc than
        else: halves.append((a, b))
    found = [r for r in halves if ((r[0] + r[1]) / 2 - front.axis) * sign > 0]
    return (min(r[0] for r in found), max(r[1] for r in found)) if found else None


head_rings = column(0.988, Z_NECK + 0.001, lambda z: head['front'].main(z))                     # bo may hang tren cung: qua hep, hay dinh mau nen
head_rings = [(head_rings[0][0] + rise, head_rings[0][1], head_rings[0][2], head_rings[0][3] * k, head_rings[0][4] * k) for rise, k in ((0.011, 0.15), (0.009, 0.45), (0.005, 0.75))] + head_rings   # bo tron dinh dau
head_rings += [(z - 0.03, cx, cy, rx * 0.9, ry * 0.9) for z, cx, cy, rx, ry in head_rings[-1:]]      # co thut vao trong than
# Mu vanh rong: hinh bong cua mu (vanh nghieng, rong hon dau) khong xep vong ngang duoc, len hinh thanh soc. Khi cau hinh co `hat`:
# dau chi giu phan so duoi mu, con mu dung thanh khoi rieng (chom tron + vanh phang) va to bang mau lay tai hai diem cua ban ve.
HAT = CFG.get('hat')            # { z: do cao vanh, brim: ban kinh vanh, crown: ban kinh chom, top: dinh chom, head_r: ban kinh dau duoi vanh, from: tu do cao nay bop dau lai, white_z, band_z: cho lay mau }
hat_rings = []
if HAT:
    zb, crown, top = HAT['z'], HAT['crown'], HAT['top']
    skull = []
    for z, cx, cy, rx, ry in head_rings:
        if z > zb + 0.03: continue
        cap = crown * 0.85 if z > zb else HAT['head_r'] if z > HAT['from'] else None
        skull.append((z, cx, cy, min(rx, cap), min(ry, cap * 1.08)) if cap else (z, cx, cy, rx, ry))
    z0, cx0, cy0, rx0, ry0 = skull[0]
    head_rings = [(z0 + 0.008, cx0, cy0, rx0 * 0.3, ry0 * 0.3)] + skull
    hat_y = at_hat = min(skull, key=lambda r: abs(r[0] - zb))[2]
    dome = [(top - (top - zb) * (1 - math.cos(a)) * 0.55, crown * math.sin(a)) for a in (0.15, 0.5, 0.9, 1.25, math.pi / 2)]
    shape = dome + [(zb + 0.014, crown), (zb + 0.006, crown * 1.02), (zb + 0.004, HAT['brim'] * 0.7), (zb + 0.001, HAT['brim']), (zb - 0.004, HAT['brim']), (zb - 0.006, HAT['brim'] * 0.7), (zb - 0.007, crown * 0.8)]
    hat_rings = [(z, 0.0, hat_y, r, r) for z, r in shape]
body_rings = column(Z_NECK - 0.012, Z_CROTCH, lambda z: body['front'].main(z))                  # bat dau duoi cam: tren do la toc, mu
trunk = head_rings + body_rings
arms = {S: column(Z_ARMPIT, Z_HAND, lambda z, sx=sx: side_runs(z, sx), round_depth=0.9) for sx, S in SIDES}
if MANUAL_LEGS:
    base_y = depth(Z_CROTCH + 0.03)[0]
    legs = {S: [(z, sx * MANUAL_LEGS['x'], base_y + cy, rx, ry) for z, rx, ry, cy in MANUAL_LEGS['rings']] for sx, S in SIDES}
else: legs = {S: column(Z_CROTCH - 0.012, Z_FOOT, lambda z, sx=sx: leg_run(z, sx)) for sx, S in SIDES}
for S in ([] if MANUAL_LEGS else legs):                                           # keo dau ong chan len trong than de khong lo nap tren
    z0, cx0, cy0, rx0, ry0 = legs[S][0]
    legs[S] = [(z0 + 0.07 * (1 - k / 3), cx0, cy0, rx0 * (0.75 + 0.08 * k), ry0 * (0.75 + 0.08 * k)) for k in range(3)] + legs[S]
for S in arms:                                           # noi tay len vai; tay treo giua than theo chieu truoc sau; dau ngon tay thon lai
    z0, cx0, cy0, rx0, ry0 = arms[S][0]
    arms[S] = [(z0 + 0.06 * (1 - k / 4), cx0 * (0.80 + 0.05 * k), cy0, rx0, ry0) for k in range(4)] + arms[S]
    arms[S] = [(z, cx, depth(z)[0] - 0.01, rx, ry) for z, cx, cy, rx, ry in arms[S]]
    z, cx, cy, rx, ry = arms[S][-1]
    arms[S] += [(z - 0.002, cx, cy, rx * 0.55, ry * 0.55)]


# ------------------------------------------------------------------ xuong dat theo so do vua lay
def at(part, z): return min(part, key=lambda r: abs(r[0] - z))


BONES = {'root': ((0, 0, 0), (0, 0, 0.08), None)}
for name, z0, z1, parent in (('hips', Z_CROTCH + 0.03, 0.45, 'root'), ('spine', 0.45, 0.56, 'hips'), ('chest', 0.56, 0.68, 'spine'), ('neck', 0.68, Z_NECK, 'chest'), ('head', Z_NECK, 1.0, 'neck')):
    BONES[name] = ((0, at(trunk, z0)[2], z0), (0, at(trunk, z1)[2], z1), parent)
for sx, S in SIDES:
    top, mid, low, end = arms[S][0], at(arms[S], (Z_ARMPIT + Z_HAND) / 2 + 0.03), at(arms[S], Z_HAND + 0.07), arms[S][-1]
    BONES[f'upperarm.{S}'] = ((top[1], top[2], top[0]), (mid[1], mid[2], mid[0]), 'chest')
    BONES[f'forearm.{S}'] = ((mid[1], mid[2], mid[0]), (low[1], low[2], low[0]), f'upperarm.{S}')
    BONES[f'hand.{S}'] = ((low[1], low[2], low[0]), (end[1], end[2], end[0]), f'forearm.{S}')
    hip, knee, ankle = legs[S][0], at(legs[S], (Z_CROTCH + Z_FOOT) / 2 + 0.02), at(legs[S], Z_FOOT + 0.04)
    BONES[f'thigh.{S}'] = ((hip[1], hip[2], Z_HIP or hip[0] + 0.03), (knee[1], knee[2], knee[0]), 'hips')
    BONES[f'shin.{S}'] = ((knee[1], knee[2], knee[0]), (ankle[1], ankle[2], ankle[0]), f'thigh.{S}')
    BONES[f'foot.{S}'] = ((ankle[1], ankle[2], ankle[0]), (ankle[1], ankle[2] - 0.09, 0.02), f'shin.{S}')
for i, name in enumerate(SCARF):                         # khan sau lung: bam sat mat lung trong anh, co chuoi xuong de bay
    za, zb = 0.66 - 0.075 * i, 0.66 - 0.075 * (i + 1)
    ya, yb = (at(body_rings, z)[2] + at(body_rings, z)[4] + 0.012 for z in (za, zb))
    BONES[name] = ((0, ya, za), (0, yb, zb), SCARF[i - 1] if i else 'chest')


def on_arm(co):
    """Diem nam trong ong tay (theo chinh cac vong da dung tay), khong doan theo be rong than."""
    for S in arms:
        if not arms[S][-1][0] - 0.01 <= co.z <= arms[S][0][0] + 0.01: continue
        z, cx, cy, rx, ry = at(arms[S], co.z)
        if ((co.x - cx) / (rx * 1.15)) ** 2 + ((co.y - cy) / (ry * 1.15)) ** 2 <= 1.0: return True
    return False


def sideways(normal, co):
    """Muc do quay sang ngang (0 = thang truoc/sau, 1 = thang sang ben). Voi dau va than, tinh theo goc quanh truc than thay vi
    phap tuyen cua mat: vien toc lom chom lam phap tuyen doi lien tuc giua cac hang, gay soc ngang."""
    if not ARM_SIDE and on_arm(co): return 0.0
    if co.z >= Z_CROTCH:
        z, cx, cy, rx, ry = at(trunk, co.z)
        if abs(co.x - cx) <= rx * 1.03:
            ex, ey = (co.x - cx) / rx, (co.y - cy) / ry
            return abs(ex) / max(math.hypot(ex, ey), 1e-6)
    return abs(normal.x)


def flat_uv(z):
    """Toa do anh cua diem giua mat truoc o do cao z tren to can canh dau: dung de to mot mau phang."""
    view = head['front']
    return (view.axis / W, 1.0 - (view.row0 - (z - view.z0) * view.scale) / H)


def project(normal, co, centre):
    """Chon goc nhin theo huong CA MAT: hai ben lay anh goc ngang, phia truoc lay anh truoc, phia sau lay anh sau; dau dung to can canh."""
    if HAT and centre.z >= HAT['z'] - 0.008:                 # mu: mot mau trang, rieng dai bang quanh chan chom lay mau bang
        on_band = HAT['z'] + 0.006 < centre.z < HAT['z'] + 0.026 and math.hypot(centre.x, centre.y - hat_y) < HAT['crown'] * 1.1
        return flat_uv(HAT['band_z'] if on_band else HAT['white_z'])
    views = views_at(centre.z)
    if sideways(normal, centre) > (SIDE_FACING_HEAD if centre.z > Z_NECK else SIDE_FACING): view, u = views['side'], views['side'].axis + SIDE_FLIP * co.y * INSET * views['side'].scale
    elif normal.y < 0 or (not ARM_SIDE and on_arm(centre)): view, u = views['front'], views['front'].axis + co.x * INSET * views['front'].scale
    else: view, u = views['back'], views['back'].axis - co.x * INSET * views['back'].scale
    z = co.z
    if HAT and centre.z > HAT['hair_z']:
        # Trong ban ve, vanh mu che mat phan toc nay. Lay mau hang toc ngay duoi vanh keo thang len (toc la soi doc nen khong lo);
        # rieng giua tran o hinh truoc thi mai toc con thay duoc toi `fringe_z`.
        fringe = view is views['front'] and abs(co.x) < HAT['fringe_x']
        z = min(z, HAT['fringe_z'] if fringe else HAT['hair_z'])
    return (u / W, 1.0 - (view.row0 - (z - view.z0) * view.scale) / H)


s = Sculpt(NAME, {'anh': (1, 1, 1)}, BONES, texture=TEXTURE, projector=project)
s.layer('dau', 'anh', ['head', 'neck'], voxel=0); s.stack(head_rings, nu=56, power=2.0)      # dau tiet dien elip de mat cong deu
if hat_rings: s.stack(hat_rings, nu=48, power=2.0)
s.layer('than', 'anh', ['neck', 'chest', 'spine', 'hips'], voxel=0); s.stack(body_rings, nu=44)
for sx, S in SIDES:
    s.layer(f'tay{S}', 'anh', [f'upperarm.{S}', f'forearm.{S}', f'hand.{S}'], voxel=0); s.stack(arms[S], nu=20, power=2.0)
    s.layer(f'chan{S}', 'anh', ['hips', f'thigh.{S}', f'shin.{S}', f'foot.{S}'], voxel=0); s.stack(legs[S], nu=28)
if SCARF: s.layer('khan', 'anh', SCARF, voxel=0, power=3.0); s.strip(SCARF, 0.045, 0.006, fold=0.15)
s.build()
turn = s.turn
idle, walk, spin = body_motion(turn)
jump, glide = air_motion(turn)


def cloth(t, mode):
    pose, flare = {}, math.sin(math.pi * t) if mode == 'turn' else 0.0
    for i, name in enumerate(SCARF):
        lag = 0.7 * (i + 1)
        if mode == 'idle': q = turn(name, X, 0.03 * math.sin(t * TAU - lag))
        elif mode == 'walk': q = turn(name, X, 0.10 + 0.05 * i + 0.08 * math.sin(2 * t * TAU - lag)) @ turn(name, Z, 0.10 * math.sin(t * TAU - lag))
        else: q = turn(name, Z, -0.2 * flare * (1 + 0.3 * i)) @ turn(name, X, 0.2 * flare)
        pose[name] = {'rot': q}
    return pose


s.animate({'Idle': (lambda t: {**idle(t), **cloth(t, 'idle')}, 2.0), 'Walk': (lambda t: {**walk(t), **cloth(t, 'walk')}, 1.0), 'Turn': (lambda t: {**spin(t), **cloth(t, 'turn')}, 1.5),
           'Jump': (lambda t: {**jump(t), **cloth(t, 'walk')}, 1.0), 'Glide': (lambda t: {**glide(t), **cloth(t, 'walk')}, 1.2)})
s.review(REVIEW_DIR, [('Idle', 1, 'truoc'), ('Idle', 1, 'mat'), ('Idle', 1, 'sau'), ('Idle', 1, 'ngang'), ('Walk', 7, 'ngang'), ('Walk', 7, 'truoc'), ('Turn', 10, 'truoc'), ('Turn', 16, 'truoc'),
                      ('Jump', 5, 'truoc'), ('Jump', 5, 'ngang'), ('Glide', 5, 'truoc'), ('Glide', 5, 'ngang')])
s.export(GLB_PATH)
