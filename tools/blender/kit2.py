# Bo dung nhan vat ban 2 (Blender chay ngam). Khac kit.py o ba diem lam nen chat luong:
#  1. Moi "lop" (da, toc, ao, quan, giay...) la nhieu khoi chong nhau roi duoc NUNG thanh mot be mat lien bang voxel remesh
#     + lam muot + nhieu nhe (nep vai), thay vi de lo cac khoi cau roi.
#  2. Trong so xuong tu tinh theo khoang cach toi cac xuong ung vien cua lop, nen khuyu tay, dau goi uon muot.
#  3. Co khoi "ong" di theo duong gap khuc (tay chan co khop, lon toc, ngon tay, hang mi) va mat tron xoay co nep gap.
import bpy, bmesh, math, os
from mathutils import Vector, Matrix, Quaternion

X, Y, Z = (1, 0, 0), (0, 1, 0), (0, 0, 1)
FPS = 24


class Layer:
    def __init__(self, name, material, bones, voxel, smooth, wrinkle, keep, power):
        self.name, self.material, self.bones, self.voxel = name, material, bones, voxel
        self.smooth, self.wrinkle, self.keep, self.power = smooth, wrinkle, keep, power
        self.bm = bmesh.new()


class Sculpt:
    def __init__(self, name, colors, bones, texture=None, projector=None):
        """texture + projector: dan mot anh len toan bo luoi; projector(phap tuyen mat, toa do dinh, tam mat) -> (u, v)."""
        bpy.ops.wm.read_factory_settings(use_empty=True)
        self.texture, self.projector = texture, projector
        self.scene = bpy.context.scene
        self.scene.render.fps = FPS
        self.name, self.colors, self.bones = name, colors, bones
        self.bone_index = {n: i for i, n in enumerate(bones)}
        self.material_index = {n: i for i, n in enumerate(colors)}
        self.layers, self.cur = [], None
        self.detail = float(os.environ.get('NV_DETAIL', '1'))   # < 1 de xuat ban nhe cho dien thoai (giam luoi manh hon)

    def layer(self, name, material, bones, voxel=0.008, smooth=6, wrinkle=0.0, keep=0.4, power=4.0):
        """Mo mot lop moi. bones: ten xuong (gan cung), danh sach xuong ung vien (chia theo khoang cach), hoac ham vi tri -> {xuong: trong so}.
        voxel = 0 thi giu nguyen luoi (khong nung). keep: ti le mat giu lai sau khi giam luoi."""
        self.cur = Layer(name, material, bones, voxel, smooth, wrinkle, keep, power)
        self.layers.append(self.cur)
        return self

    # ---------------------------------------------------------------- khoi co ban (them vao lop dang mo)
    def ball(self, center, radii, seg=20, rot=None):
        m = Matrix.Translation(center) @ (rot.to_matrix().to_4x4() if rot else Matrix.Identity(4)) @ Matrix.Diagonal((*radii, 1.0))
        bmesh.ops.create_uvsphere(self.cur.bm, u_segments=seg, v_segments=max(8, seg // 2), radius=1.0, matrix=m)

    def tube(self, points, radii, seg=10, flat=1.0):
        """Ong di qua cac diem voi ban kinh tung diem (noi suy muot), hai dau tron. flat < 1 lam ong det theo mot chieu."""
        pts = [Vector(p) for p in points]
        fine, rad = [], []
        for i in range(len(pts) - 1):            # chia nho moi doan de ong uon muot (Catmull-Rom)
            p0, p1, p2, p3 = pts[max(i - 1, 0)], pts[i], pts[i + 1], pts[min(i + 2, len(pts) - 1)]
            for k in range(4):
                t = k / 4
                fine.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
                rad.append(radii[i] + (radii[i + 1] - radii[i]) * t)
        fine.append(pts[-1]); rad.append(radii[-1])
        bm, rings, side = self.cur.bm, [], None
        for i, p in enumerate(fine):
            tangent = (fine[min(i + 1, len(fine) - 1)] - fine[max(i - 1, 0)]).normalized()
            if side is None:
                side = tangent.cross(Vector((0, 1, 0)))
                if side.length < 1e-4: side = tangent.cross(Vector((1, 0, 0)))
            side = (side - tangent * side.dot(tangent)).normalized()       # giu khung khong xoan doc ong
            up = tangent.cross(side)
            rings.append([bm.verts.new(p + (side * math.cos(j / seg * math.tau) + up * (math.sin(j / seg * math.tau) * flat)) * rad[i]) for j in range(seg)])
        for a, b in zip(rings, rings[1:]):
            for j in range(seg): bm.faces.new((a[j], a[(j + 1) % seg], b[(j + 1) % seg], b[j]))
        bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])
        for p, r in ((fine[0], rad[0]), (fine[-1], rad[-1])):               # dau tron (chi khi lop duoc nung, khong thi thua)
            if self.cur.voxel: self.ball(p, (r, r, r), 10)

    def solid(self, rings, nu=40, pleats=0, depth=0.0):
        """Khoi dac tron xoay quanh truc Z qua cac vong (z, ban kinh x, ban kinh y); pleats = so nep gap, sau dan ve vong cuoi."""
        bm, grid = self.cur.bm, []
        for k, (z, rx, ry) in enumerate(rings):
            t = k / (len(rings) - 1)
            row = []
            for i in range(nu):
                a = i / nu * math.tau
                fold = 1 + depth * t * math.sin(a * pleats) if pleats else 1
                row.append(bm.verts.new((rx * fold * math.cos(a), ry * fold * math.sin(a), z)))
            grid.append(row)
        for a, b in zip(grid, grid[1:]):
            for i in range(nu): bm.faces.new((a[i], a[(i + 1) % nu], b[(i + 1) % nu], b[i]))
        bm.faces.new(list(reversed(grid[0]))); bm.faces.new(grid[-1])

    def stack(self, rings, nu=32, power=2.3):
        """Khoi di qua cac vong (z, tam x, tam y, ban kinh x, ban kinh y) voi tiet dien sieu elip: dung de dung than, tay, chan tu hinh bong trong anh."""
        bm, grid = self.cur.bm, []
        for z, cx, cy, rx, ry in rings:
            row = []
            for i in range(nu):
                a = i / nu * math.tau
                c, sn = math.cos(a), math.sin(a)
                k = (abs(c) ** power + abs(sn) ** power) ** (-1.0 / power)
                row.append(bm.verts.new((cx + rx * k * c, cy + ry * k * sn, z)))
            grid.append(row)
        for a, b in zip(grid, grid[1:]):
            for i in range(nu): bm.faces.new((a[i], b[i], b[(i + 1) % nu], a[(i + 1) % nu]))
        bm.faces.new(grid[0]); bm.faces.new(list(reversed(grid[-1])))

    def band(self, center, rx, ry, minor, squash=1.0, nu=36, nv=8):
        """Vong hinh elip nam ngang (that lung, co ao, co giay)."""
        bm, grid = self.cur.bm, []
        for i in range(nu):
            a = i / nu * math.tau
            row = []
            for j in range(nv):
                c = j / nv * math.tau
                k = 1 + minor * math.cos(c) / max(rx, ry)
                row.append(bm.verts.new((center[0] + rx * k * math.cos(a), center[1] + ry * k * math.sin(a), center[2] + minor * squash * math.sin(c))))
            grid.append(row)
        for i in range(nu):
            for j in range(nv): bm.faces.new((grid[i][j], grid[(i + 1) % nu][j], grid[(i + 1) % nu][(j + 1) % nv], grid[i][(j + 1) % nv]))

    def strip(self, chain, width, thick, per_bone=4, flare=0.3, fold=0.0):
        """Dai vai doc mot chuoi xuong; fold > 0 lam dai cong long mang cho giong vai that. Lop phai co voxel = 0 va bones la chinh chuoi nay."""
        points = [Vector(self.bones[chain[0]][0])] + [Vector(self.bones[n][1]) for n in chain]
        total, sections, bm = len(chain) * per_bone, [], self.cur.bm
        side = (points[-1] - points[0]).cross(Vector((0, 1, 0)))
        side = side.normalized() if side.length > 1e-5 else Vector((1, 0, 0))
        normal = side.cross(points[-1] - points[0]).normalized()
        cols = 5
        for k in range(total + 1):
            t = k / per_bone
            i = min(int(t), len(chain) - 1)
            p = points[i].lerp(points[i + 1], t - i)
            w = width * (1 - flare / 2 + flare * k / total)
            row = []
            for sy in (-1, 1):
                for c in (range(cols) if sy < 0 else reversed(range(cols))):
                    u = c / (cols - 1) * 2 - 1
                    row.append(bm.verts.new(p + side * (u * w) + normal * (sy * thick + fold * w * (1 - u * u))))
            sections.append(row)
        n = len(sections[0])
        for a, b in zip(sections, sections[1:]):
            for j in range(n): bm.faces.new((a[j], a[(j + 1) % n], b[(j + 1) % n], b[j]))
        bm.faces.new(list(reversed(sections[0]))); bm.faces.new(sections[-1])

    # ---------------------------------------------------------------- nung lop, chia trong so, gop luoi
    def _bake(self, layer):
        mesh = bpy.data.meshes.new(layer.name)
        bmesh.ops.recalc_face_normals(layer.bm, faces=layer.bm.faces[:])   # phap tuyen phai huong ra ngoai, neu khong vao game bi toi nguoc
        layer.bm.normal_update(); layer.bm.to_mesh(mesh); layer.bm.free()
        if not layer.voxel: return mesh
        obj = bpy.data.objects.new(layer.name, mesh)
        self.scene.collection.objects.link(obj)
        remesh = obj.modifiers.new('nung', 'REMESH'); remesh.mode = 'VOXEL'; remesh.voxel_size = layer.voxel
        if layer.smooth:
            smooth = obj.modifiers.new('muot', 'SMOOTH'); smooth.factor = 0.5; smooth.iterations = layer.smooth
        if layer.wrinkle:
            try:
                tex = bpy.data.textures.new(layer.name + 'nep', 'CLOUDS'); tex.noise_scale = 0.07
                disp = obj.modifiers.new('nep', 'DISPLACE'); disp.texture = tex; disp.strength = layer.wrinkle; disp.mid_level = 0.5
            except Exception as error: print('wrinkle:', error)
        if layer.keep < 1:
            dec = obj.modifiers.new('giam', 'DECIMATE'); dec.ratio = max(0.05, min(1.0, layer.keep * self.detail))
        depsgraph = bpy.context.evaluated_depsgraph_get(); depsgraph.update()
        baked = bpy.data.meshes.new_from_object(obj.evaluated_get(depsgraph))
        self.scene.collection.objects.unlink(obj); bpy.data.objects.remove(obj)
        return baked

    def _weights(self, layer, co):
        if callable(layer.bones): return layer.bones(co)
        if isinstance(layer.bones, str): return {layer.bones: 1.0}
        scored = []
        for name in layer.bones:
            a, b = Vector(self.bones[name][0]), Vector(self.bones[name][1])
            ab = b - a
            t = min(max((co - a).dot(ab) / ab.length_squared, 0.0), 1.0)
            scored.append(((co - (a + ab * t)).length, name))
        scored.sort()
        best = scored[:2]
        raw = [(1.0 / (d + 0.004) ** layer.power, n) for d, n in best]
        total = sum(w for w, _ in raw)
        table = {n: w / total for w, n in raw}
        top = max(table, key=table.get)
        return {top: 1.0} if table[top] > 0.93 else table

    def build(self):
        final = bmesh.new()
        deform = final.verts.layers.deform.verify()
        for layer in self.layers:
            baked = self._bake(layer)
            v0, f0 = len(final.verts), len(final.faces)
            final.from_mesh(baked)
            final.verts.ensure_lookup_table(); final.faces.ensure_lookup_table()
            for v in final.verts[v0:]:
                for bone, w in self._weights(layer, v.co).items():
                    if w > 0.001: v[deform][self.bone_index[bone]] = w
            for f in final.faces[f0:]:
                f.material_index = self.material_index[layer.material]; f.smooth = True
            print(f'  lop {layer.name}: {len(final.verts) - v0} dinh')
            bpy.data.meshes.remove(baked)
        final.normal_update()
        if self.projector:                                  # chieu anh: moi goc cua moi mat lay toa do anh theo huong mat do
            uv = final.loops.layers.uv.new('UVMap')
            for face in final.faces:                        # goc nhin chon theo CA MAT (tam mat), neu khong mat nam vat qua ranh se keo mot vet nen ngang anh
                centre = face.calc_center_median()
                for loop in face.loops: loop[uv].uv = self.projector(face.normal, loop.vert.co, centre)
        mesh = bpy.data.meshes.new(self.name)
        final.to_mesh(mesh); final.free()
        self.mesh = mesh
        self.body = bpy.data.objects.new(self.name, mesh)
        self.scene.collection.objects.link(self.body)
        for n in self.bones: self.body.vertex_groups.new(name=n)
        for n, rgb in self.colors.items(): mesh.materials.append(self.material(n, rgb, image=self.texture))
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
        return self

    @staticmethod
    def material(name, rgb, rough=0.9, image=None):
        mat = bpy.data.materials.new(name)
        try: mat.use_nodes = True
        except Exception: pass
        linear = tuple(c ** 2.2 for c in rgb)
        bsdf = mat.node_tree.nodes.get('Principled BSDF') if mat.node_tree else None
        if bsdf:
            bsdf.inputs['Base Color'].default_value = (*linear, 1.0)
            bsdf.inputs['Roughness'].default_value = rough
            if image:
                tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
                tex.image = bpy.data.images.load(image, check_existing=True)
                mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
        mat.diffuse_color = (*linear, 1.0)
        mat.use_backface_culling = False
        return mat

    def turn(self, bone, axis, angle):
        rest = self.rest[bone]
        return (rest.inverted() @ Quaternion(Vector(axis), angle).to_matrix() @ rest).to_quaternion()

    # ---------------------------------------------------------------- hoat anh, canh duyet, xuat
    def animate(self, clips):
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
            track = self.rig.animation_data.nla_tracks.new(); track.name = clip
            strip = track.strips.new(clip, 1, action)
            try:
                if getattr(strip, 'action_slot', None) is None and len(action.slots): strip.action_slot = action.slots[0]
            except Exception as error: print('NLA slot:', error)
            track.mute = True
            self.tracks[clip] = track

    def review(self, folder, shots, target=(0, 0, 0.52), size=640):
        """Canh duyet: san xam tim, den chinh mem + den phu + den vien, may quay co dinh."""
        os.makedirs(folder, exist_ok=True)
        scene = self.scene
        floor_mesh = bpy.data.meshes.new('Floor')
        fb = bmesh.new(); bmesh.ops.create_grid(fb, x_segments=1, y_segments=1, size=8); fb.to_mesh(floor_mesh); fb.free()
        floor = bpy.data.objects.new('Floor', floor_mesh); scene.collection.objects.link(floor)
        floor_mesh.materials.append(self.material('san', (0.40, 0.39, 0.50)))

        def light(kind, energy, rotation, color=(1, 1, 1), angle=None):
            data = bpy.data.lights.new(kind, 'SUN'); data.energy = energy; data.color = color
            if angle is not None: data.angle = angle
            obj = bpy.data.objects.new(kind, data); scene.collection.objects.link(obj)
            obj.rotation_euler = tuple(math.radians(v) for v in rotation)
        light('chinh', 2.6, (52, 0, 28), (1.0, 0.96, 0.9), math.radians(12))
        light('phu', 0.9, (65, 0, -70), (0.75, 0.82, 1.0), math.radians(30))
        light('vien', 1.6, (-55, 0, 160), (1.0, 0.92, 0.85), math.radians(10))
        world = bpy.data.worlds.new('World'); scene.world = world
        try:
            world.use_nodes = True
            world.node_tree.nodes['Background'].inputs[0].default_value = (0.32, 0.31, 0.42, 1)
            world.node_tree.nodes['Background'].inputs[1].default_value = 0.9
        except Exception as error: print('World:', error)
        cam_data = bpy.data.cameras.new('Cam'); cam_data.lens = 70
        cam = bpy.data.objects.new('Cam', cam_data); scene.collection.objects.link(cam); scene.camera = cam
        scene.render.resolution_x = scene.render.resolution_y = size
        scene.render.image_settings.file_format = 'PNG'
        try: scene.view_settings.view_transform = 'Standard'    # AgX mac dinh lam mau nhat di; Standard cho mau dung nhu bang mau
        except Exception as error: print('view transform:', error)
        views = {'truoc': (0.45, -2.55, 0.66), 'ngang': (2.55, -0.4, 0.62), 'sau': (-0.6, 2.5, 0.75), 'mat': (0.14, -0.95, 0.90)}
        for clip, frame, view in shots:
            for n, track in self.tracks.items(): track.mute = n != clip
            scene.frame_set(frame)
            aim = (0, 0, 0.87) if view == 'mat' else target
            cam.location = views[view]
            cam.rotation_euler = (Vector(aim) - Vector(views[view])).to_track_quat('-Z', 'Y').to_euler()
            scene.render.filepath = os.path.join(folder, f'{self.name}-{clip}-{frame:02d}-{view}.png')
            bpy.ops.render.render(write_still=True)

    def export(self, path):
        for track in self.tracks.values(): track.mute = False
        self.scene.frame_set(1)
        for obj in self.scene.objects: obj.select_set(obj in (self.body, self.rig))
        bpy.context.view_layer.objects.active = self.rig
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        image = {'export_image_format': 'JPEG', 'export_jpeg_quality': 88} if self.texture else {}   # anh ve: JPEG nhe hon PNG nhieu lan
        bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_animations=True,
                                  export_animation_mode='NLA_TRACKS', export_skins=True, export_yup=True, export_apply=False, **image)
        tris = sum(len(p.vertices) - 2 for p in self.mesh.polygons)
        print(f'KIT2 OK {self.name} verts={len(self.mesh.vertices)} tris={tris} bones={len(self.bones)} glb={os.path.getsize(path)}')
