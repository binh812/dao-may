# Dung nhan vat "ban Nhim" bang kich ban Blender (khong mo giao dien), xuat .glb cho game va anh "canh duyet".
# Chay:  blender -b -P tools/blender/nhim.py -- <thu muc anh duyet> <duong dan .glb>
# Quy trinh (theo cach lam nhan vat cach dieu): phac kho dau to than nho -> xep lop tung phan -> khung xuong co chuoi xuong rieng
# cho khan quang -> hoat anh tung doan (dung yen co chop mat, di bo) -> chuyen dong theo sau cho khan -> canh duyet co dinh.
import bpy, bmesh, math, os, sys
from mathutils import Vector, Matrix, Quaternion

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
REVIEW_DIR = argv[0] if len(argv) > 0 else os.path.join(os.getcwd(), 'review')
GLB_PATH = argv[1] if len(argv) > 1 else os.path.join(os.getcwd(), 'nhim.glb')
FPS = 24

# mau sRGB nhu nhin tren man hinh (Blender can tuyen tinh: doi o make_material)
COLORS = {
    'kem': (0.98, 0.90, 0.76), 'nau': (0.55, 0.36, 0.22), 'gai': (0.38, 0.24, 0.15), 'den': (0.13, 0.10, 0.12),
    'hong': (0.98, 0.62, 0.62), 'khan': (0.86, 0.26, 0.20), 'giay': (0.45, 0.27, 0.16), 'ao': (0.36, 0.62, 0.40),
}
# xuong: ten -> (dau, duoi, cha). Truc Z huong len, mat nhan vat quay ve -Y.
BONES = {
    'root': ((0, 0, 0), (0, 0, 0.12), None),
    'body': ((0, 0, 0.16), (0, 0, 0.42), 'root'),
    'head': ((0, 0, 0.42), (0, 0, 0.80), 'body'),
    'eyes': ((0, -0.21, 0.645), (0, -0.21, 0.72), 'head'),   # goc xuong o giua mat: chop mat la bop theo truc doc cua xuong
    'arm.L': ((0.15, 0, 0.38), (0.24, 0, 0.22), 'body'), 'arm.R': ((-0.15, 0, 0.38), (-0.24, 0, 0.22), 'body'),
    'leg.L': ((0.08, 0, 0.16), (0.08, 0, 0.0), 'root'), 'leg.R': ((-0.08, 0, 0.16), (-0.08, 0, 0.0), 'root'),
    'scarf.1': ((0, 0.15, 0.42), (0, 0.22, 0.34), 'body'), 'scarf.2': ((0, 0.22, 0.34), (0, 0.27, 0.25), 'scarf.1'),
    'scarf.3': ((0, 0.27, 0.25), (0, 0.31, 0.16), 'scarf.2'), 'scarf.4': ((0, 0.31, 0.16), (0, 0.34, 0.07), 'scarf.3'),
}
BONE_INDEX = {name: i for i, name in enumerate(BONES)}
MATERIAL_INDEX = {name: i for i, name in enumerate(COLORS)}

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = FPS

# ------------------------------------------------------------------ luoi: moi phan mot khoi, gan cung vao mot xuong
bm = bmesh.new()
deform = bm.verts.layers.deform.verify()

def finish(verts, bone, material, weights=None):
    """Gan xuong va mau cho cac dinh vua tao. weights: ham dinh -> {xuong: trong so} cho phan mem (khan)."""
    faces = {f for v in verts for f in v.link_faces}
    for f in faces:
        f.material_index = MATERIAL_INDEX[material]; f.smooth = True
    for v in verts:
        for name, w in (weights(v) if weights else {bone: 1.0}).items():
            v[deform][BONE_INDEX[name]] = w

def ball(center, radii, bone, material, seg=20):
    m = Matrix.Translation(center) @ Matrix.Diagonal((*radii, 1.0))
    finish(bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=max(8, seg // 2), radius=1.0, matrix=m)['verts'], bone, material)

def cone(base, tip, radius, bone, material, seg=8):
    base, tip = Vector(base), Vector(tip)
    axis = tip - base
    m = Matrix.Translation((base + tip) / 2) @ axis.to_track_quat('Z', 'Y').to_matrix().to_4x4()
    finish(bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=radius, radius2=0.004, depth=axis.length, matrix=m)['verts'], bone, material)

def ring(center, major, minor, bone, material, nu=20, nv=8):
    """Vong khan quanh co (hinh xuyen nam ngang)."""
    grid = []
    for i in range(nu):
        a = i / nu * math.tau
        grid.append([bm.verts.new((center[0] + (major + minor * math.cos(j / nv * math.tau)) * math.cos(a),
                                   center[1] + (major + minor * math.cos(j / nv * math.tau)) * math.sin(a),
                                   center[2] + minor * math.sin(j / nv * math.tau))) for j in range(nv)])
    for i in range(nu):
        for j in range(nv):
            bm.faces.new((grid[i][j], grid[(i + 1) % nu][j], grid[(i + 1) % nu][(j + 1) % nv], grid[i][(j + 1) % nv]))
    finish([v for row in grid for v in row], bone, material)

def scarf_tail(chain, width, thick, material, per_bone=3):
    """Dai khan chay doc chuoi xuong: moi dinh chia trong so giua hai xuong ke nhau de uon muot."""
    points = [Vector(BONES[chain[0]][0])] + [Vector(BONES[name][1]) for name in chain]
    sections, total = [], len(chain) * per_bone
    for k in range(total + 1):
        t = k / per_bone
        i = min(int(t), len(chain) - 1)
        p = points[i].lerp(points[i + 1], t - i)
        w = width * (0.85 + 0.35 * k / total)           # duoi khan xoe nhe
        quad = [bm.verts.new((p.x + sx * w, p.y + sy * thick, p.z)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        blend = min(max(t - i, 0.0), 1.0)
        for v in quad:
            v[deform][BONE_INDEX[chain[i]]] = 1.0 if i == len(chain) - 1 else 1.0 - blend * 0.5
            if i < len(chain) - 1: v[deform][BONE_INDEX[chain[i + 1]]] = blend * 0.5
        sections.append(quad)
    for a, b in zip(sections, sections[1:]):
        for j in range(4):
            bm.faces.new((a[j], a[(j + 1) % 4], b[(j + 1) % 4], b[j]))
    bm.faces.new(sections[-1])
    for f in {f for q in sections for v in q for f in v.link_faces}:
        f.material_index = MATERIAL_INDEX[material]; f.smooth = True

# buoc 3: phac kho, dau to than nho
ball((0, 0, 0.29), (0.17, 0.15, 0.16), 'body', 'ao')                    # than (ao xanh)
ball((0, -0.02, 0.60), (0.24, 0.22, 0.21), 'head', 'kem')               # dau
ball((0, -0.22, 0.555), (0.085, 0.075, 0.06), 'head', 'kem', 14)        # mom
ball((0, -0.295, 0.57), (0.028, 0.022, 0.022), 'head', 'den', 10)       # mui
for side in (-1, 1):
    ball((side * 0.105, -0.208, 0.645), (0.034, 0.020, 0.046), 'eyes', 'den', 12)     # mat (nho ra khoi mat cau cua dau, khong thi chim mat)
    ball((side * 0.165, -0.150, 0.565), (0.040, 0.016, 0.028), 'head', 'hong', 10)    # ma hong
    ball((side * 0.165, 0.00, 0.80), (0.055, 0.035, 0.055), 'head', 'nau', 10)         # tai
# buoc 4: xep lop: ao gai phu lung va dinh dau, roi tung chiec gai
ball((0, 0.06, 0.62), (0.255, 0.225, 0.225), 'head', 'nau')
ball((0, 0.07, 0.31), (0.165, 0.14, 0.15), 'body', 'nau')
spikes = []
for row in range(5):
    for col in range(7 - (row % 2)):
        u = (col + (row % 2) * 0.5) / 6 - 0.5                # -0.5..0.5 ngang lung
        v = row / 4                                           # 0 (gay) .. 1 (dinh dau)
        direction = Vector((math.sin(u * 2.4), 0.55 + 0.45 * math.cos(u * 2.4), -0.25 + 1.1 * v)).normalized()
        centre = Vector((0, 0.06, 0.62))
        base = centre + Vector((direction.x * 0.25, direction.y * 0.22, direction.z * 0.22))
        cone(base - direction * 0.02, base + direction * 0.10, 0.045, 'head', 'gai')
for col in range(5):                                          # hang gai tren lung
    u = col / 4 - 0.5
    direction = Vector((math.sin(u * 2.0), 0.9, 0.25)).normalized()
    base = Vector((0, 0.07, 0.33)) + Vector((direction.x * 0.16, direction.y * 0.135, direction.z * 0.14))
    cone(base - direction * 0.02, base + direction * 0.085, 0.04, 'body', 'gai')
for side, tag in ((1, 'L'), (-1, 'R')):
    ball((side * 0.195, -0.01, 0.30), (0.045, 0.045, 0.085), f'arm.{tag}', 'kem', 12)   # tay
    ball((side * 0.08, 0.0, 0.09), (0.055, 0.055, 0.075), f'leg.{tag}', 'kem', 12)      # chan
    ball((side * 0.08, -0.035, 0.03), (0.065, 0.095, 0.04), f'leg.{tag}', 'giay', 12)   # giay
ring((0, 0, 0.435), 0.155, 0.04, 'body', 'khan')                                        # khan quanh co
scarf_tail(['scarf.1', 'scarf.2', 'scarf.3', 'scarf.4'], 0.055, 0.012, 'khan')         # duoi khan co xuong rieng

mesh = bpy.data.meshes.new('Nhim')
bm.normal_update(); bm.to_mesh(mesh); bm.free()
body = bpy.data.objects.new('Nhim', mesh)
scene.collection.objects.link(body)
for name in BONES: body.vertex_groups.new(name=name)

def make_material(name, rgb):
    mat = bpy.data.materials.new(name)
    try: mat.use_nodes = True
    except Exception: pass
    bsdf = mat.node_tree.nodes.get('Principled BSDF') if mat.node_tree else None
    linear = tuple(c ** 2.2 for c in rgb)
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (*linear, 1.0)
        bsdf.inputs['Roughness'].default_value = 0.85
    mat.diffuse_color = (*linear, 1.0)
    return mat
for name, rgb in COLORS.items(): mesh.materials.append(make_material(name, rgb))

# ------------------------------------------------------------------ buoc 5: khung xuong
arm_data = bpy.data.armatures.new('NhimRig')
rig = bpy.data.objects.new('NhimRig', arm_data)
scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
for name, (head, tail, parent) in BONES.items():
    bone = arm_data.edit_bones.new(name)
    bone.head, bone.tail = head, tail
    if parent: bone.parent = arm_data.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
body.parent = rig
body.modifiers.new('Armature', 'ARMATURE').object = rig
REST = {name: arm_data.bones[name].matrix_local.to_3x3() for name in BONES}

def turn(name, axis, angle):
    """Quay xuong quanh mot truc cua khung (X: gat truoc sau, Y: nghieng, Z: xoay) roi doi sang he rieng cua xuong."""
    rest = REST[name]
    return (rest.inverted() @ Quaternion(Vector(axis), angle).to_matrix() @ rest).to_quaternion()
X, Y, Z = (1, 0, 0), (0, 1, 0), (0, 0, 1)

# ------------------------------------------------------------------ buoc 6-7: hoat anh tung doan; khan di sau than mot nhip
def idle(t):   # t: 0..1 trong mot vong 2 giay
    breath = math.sin(t * math.tau)
    blink = 0.12 if 0.62 < t < 0.68 else 1.0
    pose = {
        'body': {'scale': (1 + 0.015 * breath, 1 + 0.015 * breath, 1 + 0.03 * breath)},
        'head': {'rot': turn('head', X, 0.04 * breath) @ turn('head', Z, 0.05 * math.sin(t * math.tau * 0.5))},
        'eyes': {'scale': (1, blink, 1)},
        'arm.L': {'rot': turn('arm.L', Y, 0.05 * breath)}, 'arm.R': {'rot': turn('arm.R', Y, -0.05 * breath)},
    }
    for i in range(4):   # khan dua nhe, moi dot tre hon dot truoc
        pose[f'scarf.{i + 1}'] = {'rot': turn(f'scarf.{i + 1}', X, 0.05 * math.sin(t * math.tau - 0.5 * i)) @ turn(f'scarf.{i + 1}', Y, 0.06 * math.sin(t * math.tau * 0.5 - 0.6 * i))}
    return pose

def walk(t):   # t: 0..1 trong mot chu ky buoc (1 giay)
    swing = math.sin(t * math.tau)
    bob = abs(math.sin(t * math.tau))
    pose = {
        'root': {'loc': (0, 0.035 * bob, 0)},     # truc doc cua xuong root la Z cua khung
        'body': {'rot': turn('body', Z, 0.10 * swing) @ turn('body', X, -0.06), 'scale': (1, 1, 1)},
        'head': {'rot': turn('head', Z, -0.07 * swing) @ turn('head', Y, 0.04 * swing)},
        'eyes': {'scale': (1, 1, 1)},
        'leg.L': {'rot': turn('leg.L', X, 0.55 * swing)}, 'leg.R': {'rot': turn('leg.R', X, -0.55 * swing)},
        'arm.L': {'rot': turn('arm.L', X, -0.45 * swing)}, 'arm.R': {'rot': turn('arm.R', X, 0.45 * swing)},
    }
    for i in range(4):   # khan bay ra sau vi dang di toi, va lac ngang tre dan theo tung dot
        lag = 0.9 * (i + 1)
        pose[f'scarf.{i + 1}'] = {'rot': turn(f'scarf.{i + 1}', X, 0.20 + 0.10 * i + 0.10 * math.sin(2 * t * math.tau - lag))
                                  @ turn(f'scarf.{i + 1}', Z, 0.16 * math.sin(t * math.tau - lag))}
    return pose

CLIPS = {'Idle': (idle, 2.0), 'Walk': (walk, 1.0)}
rig.animation_data_create()
for pb in rig.pose.bones: pb.rotation_mode = 'QUATERNION'
actions = {}
for clip, (fn, seconds) in CLIPS.items():
    action = bpy.data.actions.new(clip)
    rig.animation_data.action = action
    frames = int(round(seconds * FPS))
    for f in range(frames + 1):
        pose = fn(f / frames)
        for pb in rig.pose.bones:
            p = pose.get(pb.name, {})
            pb.rotation_quaternion = p.get('rot', Quaternion())
            pb.scale = p.get('scale', (1, 1, 1))
            pb.location = p.get('loc', (0, 0, 0))
            pb.keyframe_insert('rotation_quaternion', frame=f + 1)
            pb.keyframe_insert('scale', frame=f + 1)
            pb.keyframe_insert('location', frame=f + 1)
    actions[clip] = (action, frames)
rig.animation_data.action = None
tracks = {}
for clip, (action, frames) in actions.items():
    track = rig.animation_data.nla_tracks.new()
    track.name = clip
    strip = track.strips.new(clip, 1, action)
    try:
        if getattr(strip, 'action_slot', None) is None and len(action.slots): strip.action_slot = action.slots[0]
    except Exception as error: print('NLA slot:', error)
    track.mute = True
    tracks[clip] = track

# ------------------------------------------------------------------ buoc 8: canh duyet (san xam, may quay co dinh)
os.makedirs(REVIEW_DIR, exist_ok=True)
floor_mesh = bpy.data.meshes.new('Floor')
fb = bmesh.new(); bmesh.ops.create_grid(fb, x_segments=1, y_segments=1, size=6); fb.to_mesh(floor_mesh); fb.free()
floor = bpy.data.objects.new('Floor', floor_mesh); scene.collection.objects.link(floor)
floor_mesh.materials.append(make_material('san', (0.55, 0.54, 0.60)))
sun_data = bpy.data.lights.new('Sun', 'SUN'); sun_data.energy = 3.5
sun = bpy.data.objects.new('Sun', sun_data); scene.collection.objects.link(sun)
sun.rotation_euler = (math.radians(50), 0, math.radians(35))
world = bpy.data.worlds.new('World'); scene.world = world
try:
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (0.30, 0.29, 0.36, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = 1.2
except Exception as error: print('World:', error)
cam_data = bpy.data.cameras.new('Cam'); cam_data.lens = 60
cam = bpy.data.objects.new('Cam', cam_data); scene.collection.objects.link(cam); scene.camera = cam
scene.render.resolution_x, scene.render.resolution_y = 560, 560
scene.render.image_settings.file_format = 'PNG'

def shoot(tag, position, target=(0, 0, 0.42)):
    cam.location = position
    cam.rotation_euler = (Vector(target) - Vector(position)).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = os.path.join(REVIEW_DIR, tag + '.png')
    bpy.ops.render.render(write_still=True)

VIEWS = {'truoc': (0.9, -2.6, 0.75), 'ngang': (2.7, 0.0, 0.7), 'sau': (-0.9, 2.6, 0.9)}
SHOTS = [('Idle', 1, 'truoc'), ('Idle', 32, 'truoc'), ('Idle', 1, 'sau'), ('Walk', 1, 'ngang'), ('Walk', 7, 'ngang'), ('Walk', 13, 'ngang'), ('Walk', 19, 'ngang'), ('Walk', 7, 'sau')]
rendered = True
for clip, frame, view in SHOTS:
    for name, track in tracks.items(): track.mute = name != clip
    scene.frame_set(frame)
    try: shoot(f'{clip}-{frame:02d}-{view}', VIEWS[view])
    except Exception as error:
        print('RENDER FAILED:', error); rendered = False; break

# ------------------------------------------------------------------ xuat .glb: chi nhan vat va khung xuong, moi track NLA la mot doan hoat anh
for track in tracks.values(): track.mute = False
scene.frame_set(1)
for obj in scene.objects: obj.select_set(obj in (body, rig))
bpy.context.view_layer.objects.active = rig
os.makedirs(os.path.dirname(os.path.abspath(GLB_PATH)), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=GLB_PATH, export_format='GLB', use_selection=True, export_animations=True,
                          export_animation_mode='NLA_TRACKS', export_skins=True, export_yup=True, export_apply=False)
print(f'NHIM OK rendered={rendered} verts={len(mesh.vertices)} tris={sum(len(p.vertices) - 2 for p in mesh.polygons)} glb={os.path.getsize(GLB_PATH)}')
