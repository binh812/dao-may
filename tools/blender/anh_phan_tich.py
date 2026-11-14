# Doc mot to thiet ke ba goc nhin (ngang | truoc | sau tren nen xam phang) va in ra so do: khung bao tung goc, cac "doan" nhan vat
# tren moi hang. Dung de dat cac moc (vai, nach, dung, co chan) truoc khi dung luoi tu anh bang tu_anh.py.
# Chay:  blender -b -P tools/blender/anh_phan_tich.py -- <anh.png>
import bpy, sys
import numpy as np

path = sys.argv[sys.argv.index('--') + 1]


def load(path):
    img = bpy.data.images.load(path)
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1, :, :3]   # hang 0 la mep tren
    return px, w, h


def mask_of(px, threshold=0.085):
    """Diem anh thuoc nhan vat: khac mau nen (lay tu vien anh) du nhieu. Nen co bong mo duoi chan nen nguong khong qua thap."""
    bg = np.median(np.concatenate([px[:12].reshape(-1, 3), px[:, :12].reshape(-1, 3), px[:, -12:].reshape(-1, 3)]), axis=0)
    return np.abs(px - bg).max(axis=2) > threshold, bg


def runs(row):
    """Cac doan lien tiep True tren mot hang: [(x0, x1)], bo doan ngan hon 3 diem anh."""
    edges = np.flatnonzero(np.diff(np.concatenate(([0], row.astype(np.int8), [0]))))
    return [(int(a), int(b)) for a, b in zip(edges[::2], edges[1::2]) if b - a >= 3]


if __name__ == '__main__':
    px, w, h = load(path)
    mask, bg = mask_of(px)
    print('ANH', w, h, 'nen', np.round(bg, 3))
    cols = mask.sum(axis=0) > 2
    views = runs(cols)
    print('COT', views)
    for x0, x1 in views:
        sub = mask[:, x0:x1]
        rows = np.flatnonzero(sub.sum(axis=1) > 1)
        top, bottom = int(rows[0]), int(rows[-1])
        print(f'GOC x {x0}-{x1} y {top}-{bottom} cao {bottom - top}')
        for k in range(0, 21):
            y = top + (bottom - top) * k // 20
            print(f'   z={1 - k / 20:.2f} y={y}', [(a + x0, b + x0) for a, b in runs(sub[y])])
