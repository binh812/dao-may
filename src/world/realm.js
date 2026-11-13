// The gioi dang choi. Phan game dung chung (play, session, app) chi noi chuyen voi the gioi qua doi tuong nay,
// nen them mot the gioi moi khong phai sua luat choi. Moi the gioi nam trong src/worlds/<ten>.js va export default
// mot dinh nghia dang:
//   { name, groundAt(x, z), colliders: [{x, z, r}], safeRadius, spawn: {x, z}, spawnSpots: [[x, z]], treeSpot: {x, z},
//     cameraYaw, fogScale, paint, sky (Object3D bam theo may quay), setGrassVisible(bool), update(dt, time, ctx) }
// ctx = { playing, wind, player } voi player la trang thai cua player-core (hoac null o che do ngam canh).
const REQUIRED = ['name', 'groundAt', 'colliders', 'safeRadius', 'spawn', 'spawnSpots', 'treeSpot', 'sky', 'setGrassVisible', 'update'];

export const realm = { name: null };

export function setRealm(definition) {
  for (const key of REQUIRED) if (definition[key] === undefined) throw new Error(`dinh nghia the gioi thieu "${key}"`);
  Object.assign(realm, { cameraYaw: -0.75, fogScale: 1, paint: false }, definition);
  return realm;
}
