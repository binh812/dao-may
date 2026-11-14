# Bo cong cu dung nhan vat bang kich ban Blender (chay ngam). Mot nhan vat = bang mau + bang xuong + cac khoi gan vao xuong
# + cac ham hoat anh t(0..1) -> tu the. Dung chung cho moi nhan vat; xem nguoi.py de biet cach goi.
import bpy, bmesh, math, os
from mathutils import Vector, Matrix, Quaternion

X, Y, Z = (1, 0, 0), (0, 1, 0), (0, 0, 1)
FPS = 24


class Builder:
    """Gom moi khoi vao mot luoi; moi dinh mang trong so xuong va moi mat mang chi so vat lieu."""

    def __init__(self, name, colors, bones):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        self.scene = bpy.context.scene
        self.scene.render.fps = FPS
        self.name, self.colors, self.bones = name, colors, bones
        self.bone_index = {n: i for i, n in enumerate(bones)}
        self.material_index = {n: i for i, n in enumerate(colors)}
        self.bm = bmesh.new()
        self.deform = self.bm.verts.layers.deform.verify()

    # ---------------------------------------------------------------- khoi co ban
    def _finish(self, verts, weights, material):
        """weights: ten xuong, hoac ham dinh -> {xuong: trong so} (cho phan mem nhu vay, khan)."""
        for f in {f for v in verts for f in v.link_faces}:
            f.material_index = self.material_index[material]; f.smooth = True
        for v in verts:
            table = weights(v.co) if callable(weights) else {weights: 1.0}
            total = sum(table.values()) or 1.0
            for bone, w in table.items():
                if w > 0: v[self.deform][self.bone_index[bone]] = w / total

    def ball(self, center, radii, bone, material, seg=18):
        m = Matrix.Translation(center) @ Matrix.Diagonal((*radii, 1.0))
        self._finish(bmesh.ops.create_uvsphere(self.bm, u_segments=seg, v_segments=max(8, seg // 2), radius=1.0, matrix=m)['verts'], bone, material)

    def limb(self, a, b, ra, rb, bone, material, seg=12):
        """Tay, chan, ong quan: ong thon dan co hai dau tron."""
        a, b = Vector(a), Vector(b)
        axis = b - a
        m = Matrix.Translation((a + b) / 2) @ axis.to_track_quat('Z', 'Y').to_matrix().to_4x4()
        self._finish(bmesh.ops.create_cone(self.bm, cap_ends=False, segments=seg, radius1=ra, radius2=rb, depth=axis.length, matrix=m)['verts'], bone, material)
        self.ball(a, (ra, ra, ra), bone, material, seg); self.ball(b, (rb, rb, rb), bone, material, seg)

    def spike(self, base, tip, radius, bone, material, seg=8):
        base, tip = Vector(base), Vector(tip)
        axis = tip - base
        m = Matrix.Translation((base + tip) / 2) @ axis.to_track_quat('Z', 'Y').to_matrix().to_4x4()
        self._finish(bmesh.ops.create_cone(self.bm, cap_ends=True, segments=seg, radius1=radius, radius2=0.004, depth=axis.length, matrix=m)['verts'], bone, material)

    def ring(self, center, major, minor, bone, material, squash=1.0, nu=22, nv=8):
        """Vong nam ngang (khan quanh co, that lung, dai mu). squash < 1 lam vong det theo chieu doc."""
        grid = []
        for i in range(nu):
            a = i / nu * math.tau
            row = []
            for j in range(nv):
                c = j / nv * math.tau
                r = major + minor * math.cos(c)
                row.append(self.bm.verts.new((center[0] + r * math.cos(a), center[1] + r * math.sin(a), center[2] + minor * squash * math.sin(c))))
            grid.append(row)
        for i in range(nu):
            for j in range(nv):
                self.bm.faces.new((grid[i][j], grid[(i + 1) % nu][j], grid[(i + 1) % nu][(j + 1) % nv], grid[i][(j + 1) % nv]))
        self._finish([v for row in grid for v in row], bone, material)

    def lathe(self, rings, weights, material, nu=28, close_top=False):
        """Mat tron xoay quanh truc Z di qua cac vong (z, ban kinh): vay hinh chuong, vanh mu, ta ao."""
        grid = [[self.bm.verts.new((r * math.cos(i / nu * math.tau), r * math.sin(i / nu * math.tau), z)) for i in range(nu)] for z, r in rings]
        for a, b in zip(grid, grid[1:]):
            for i in range(nu):
                self.bm.faces.new((a[i], a[(i + 1) % nu], b[(i + 1) % nu], b[i]))
        if close_top: self.bm.faces.new(grid[0])
        self._finish([v for row in grid for v in row], weights, material)

    def strip(self, chain, width, thick, material, per_bone=3, flare=0.35):
        """Dai vai chay doc mot chuoi xuong (duoi khan, day no): dinh chia trong so giua hai xuong ke nhau de uon muot."""
        points = [Vector(self.bones[chain[0]][0])] + [Vector(self.bones[n][1]) for n in chain]
        total, sections = len(chain) * per_bone, []
        side = (points[-1] - points[0]).cross(Vector((0, 0, 1)))
        side = side.normalized() if side.length > 1e-5 else Vector((1, 0, 0))
        normal = side.cross(points[-1] - points[0]).normalized()
        for k in range(total + 1):
            t = k / per_bone
            i = min(int(t), len(chain) - 1)
            p = points[i].lerp(points[i + 1], t - i)
            w = width * (1 - flare / 2 + flare * k / total)
            quad = [self.bm.verts.new(p + side * (sx * w) + normal * (sy * thick)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
            blend = min(max(t - i, 0.0), 1.0) * 0.5
            for v in quad:
                last = i == len(chain) - 1
                v[self.deform][self.bone_index[chain[i]]] = 1.0 if last else 1.0 - blend
                if not last and blend > 0: v[self.deform][self.bone_index[chain[i + 1]]] = blend
            sections.append(quad)
        for a, b in zip(sections, sections[1:]):
            for j in range(4): self.bm.faces.new((a[j], a[(j + 1) % 4], b[(j + 1) % 4], b[j]))
        self.bm.faces.new(sections[-1])
        for f in {f for q in sections for v in q for f in v.link_faces}:
            f.material_index = self.material_index[material]; f.smooth = True

    def curls(self, center, radii, size, count, bone, material, keep):
        """Toc tu nhieu lon nho rai deu tren mat cau cua dau; keep(huong) quyet dinh cho nao co toc."""
        golden = math.pi * (3 - math.sqrt(5))
        for i in range(count):
            z = 1 - 2 * (i + 0.5) / count
            r = math.sqrt(max(0.0, 1 - z * z))
            d = Vector((r * math.cos(i * golden), r * math.sin(i * golden), z))
            if not keep(d): continue
            s = size * (0.9 + 0.2 * ((i * 37) % 10) / 10)
            self.ball((center[0] + d.x * radii[0], center[1] + d.y * radii[1], center[2] + d.z * radii[2]), (s, s, s), bone, material, 10)

    # ---------------------------------------------------------------- luoi, vat lieu, khung xuong
    @staticmethod
    def material(name, rgb):
        mat = bpy.data.materials.new(name)
        try: mat.use_nodes = True
        except Exception: pass
        linear = tuple(c ** 2.2 for c in rgb)   # bang mau viet theo sRGB, Blender can tuyen tinh
        bsdf = mat.node_tree.nodes.get('Principled BSDF') if mat.node_tree else None
        if bsdf:
            bsdf.inputs['Base Color'].default_value = (*linear, 1.0)
            bsdf.inputs['Roughness'].default_value = 0.85
        mat.diffuse_color = (*linear, 1.0)
        mat.use_backface_culling = False       # vay, vanh mu, khan la mat mong: phai thay ca hai phia
        return mat

    def build(self):
        mesh = bpy.data.meshes.new(self.name)
        self.bm.normal_update(); self.bm.to_mesh(mesh); self.bm.free()
        self.body = bpy.data.objects.new(self.name, mesh)
        self.scene.collection.objects.link(self.body)
        for n in self.bones: self.body.vertex_groups.new(name=n)
        for n, rgb in self.colors.items(): mesh.materials.append(self.material(n, rgb))
        arm = bpy.data.armatures.new(self.name + 'Rig')
        self.rig = bpy.data.objects.new(self.name + 'Rig', arm)
        self.scene.collection.objects.link(self.rig)
        bpy.context.view_layer.objects.active = self.rig
        bpy.ops.object.mode_set(mode='EDIT')
        for n, (head, tail, parent) in self.bones.items():
            bone = arm.edit_bones.new(n)
            bone.head, bone.tail = head, tail
            if parent: bone.parent = arm.edit_bones[parent]
        bpy.ops.object.mode_set(mode='OBJECT')
        self.body.parent = self.rig
        self.body.modifiers.new('Armature', 'ARMATURE').object = self.rig
        self.rest = {n: arm.bones[n].matrix_local.to_3x3() for n in self.bones}
        self.mesh = mesh
        return self

    def turn(self, bone, axis, angle):
        """Quay xuong quanh mot truc cua khung (khong phai truc rieng cua xuong) roi doi sang he cua xuong."""
        rest = self.rest[bone]
        return (rest.inverted() @ Quaternion(Vector(axis), angle).to_matrix() @ rest).to_quaternion()

    # ---------------------------------------------------------------- hoat anh, canh duyet, xuat
    def animate(self, clips):
        """clips: ten -> (ham t -> {xuong: {'rot': quat, 'scale': (..), 'loc': (..)}}, so giay). Moi doan thanh mot track NLA."""
        self.rig.animation_data_create()
        for pb in self.rig.pose.bones: pb.rotation_mode = 'QUATERNION'
        self.tracks, actions = {}, {}
        for clip, (fn, seconds) in clips.items():
            action = bpy.data.actions.new(clip)
            self.rig.animation_data.action = action
            frames = int(round(seconds * FPS))
            for f in range(frames + 1):
                pose = fn(f / frames)
                for pb in self.rig.pose.bones:
                    p = pose.get(pb.name, {})
                    pb.rotation_quaternion = p.get('rot', Quaternion())
                    pb.scale = p.get('scale', (1, 1, 1))
                    pb.location = p.get('loc', (0, 0, 0))
                    for path in ('rotation_quaternion', 'scale', 'location'): pb.keyframe_insert(path, frame=f + 1)
            actions[clip] = action
        self.rig.animation_data.action = None
        for clip, action in actions.items():
            track = self.rig.animation_data.nla_tracks.new()
            track.name = clip
            strip = track.strips.new(clip, 1, action)
            try:
                if getattr(strip, 'action_slot', None) is None and len(action.slots): strip.action_slot = action.slots[0]
            except Exception as error: print('NLA slot:', error)
            track.mute = True
            self.tracks[clip] = track

    def review(self, folder, shots, target=(0, 0, 0.5), size=520):
        """Canh duyet: san xam, mot den, may quay co dinh. shots: (ten doan, khung, goc nhin)."""
        os.makedirs(folder, exist_ok=True)
        scene = self.scene
        floor_mesh = bpy.data.meshes.new('Floor')
        fb = bmesh.new(); bmesh.ops.create_grid(fb, x_segments=1, y_segments=1, size=6); fb.to_mesh(floor_mesh); fb.free()
        floor = bpy.data.objects.new('Floor', floor_mesh); scene.collection.objects.link(floor)
        floor_mesh.materials.append(self.material('san', (0.55, 0.54, 0.60)))
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
        scene.render.resolution_x = scene.render.resolution_y = size
        scene.render.image_settings.file_format = 'PNG'
        views = {'truoc': (0.9, -3.0, 0.85), 'ngang': (3.1, 0.0, 0.8), 'sau': (-0.9, 3.0, 1.0)}
        for clip, frame, view in shots:
            for n, track in self.tracks.items(): track.mute = n != clip
            scene.frame_set(frame)
            cam.location = views[view]
            cam.rotation_euler = (Vector(target) - Vector(views[view])).to_track_quat('-Z', 'Y').to_euler()
            scene.render.filepath = os.path.join(folder, f'{self.name}-{clip}-{frame:02d}-{view}.png')
            bpy.ops.render.render(write_still=True)

    def export(self, path):
        for track in self.tracks.values(): track.mute = False
        self.scene.frame_set(1)
        for obj in self.scene.objects: obj.select_set(obj in (self.body, self.rig))
        bpy.context.view_layer.objects.active = self.rig
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_animations=True,
                                  export_animation_mode='NLA_TRACKS', export_skins=True, export_yup=True, export_apply=False)
        tris = sum(len(p.vertices) - 2 for p in self.mesh.polygons)
        print(f'KIT OK {self.name} verts={len(self.mesh.vertices)} tris={tris} bones={len(self.bones)} glb={os.path.getsize(path)}')
