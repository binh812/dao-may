// Toan cua dau vao: can ao va doi huong theo may quay. Module thuan, khong DOM.

/**
 * Doi do lech ngon tay (px, y man hinh huong xuong) thanh can ao: y duong la day len, do lon 0..1.
 * Vung chet duoc co gian lai de ra khoi vung chet khong bi giat.
 */
export function stickFromDrag(dx, dy, maxRadius = 56, deadZone = 0.15) {
  const length = Math.hypot(dx, dy), raw = Math.min(length / maxRadius, 1);
  if (raw <= deadZone || length === 0) return { x: 0, y: 0 };
  const scaled = (raw - deadZone) / (1 - deadZone);
  return { x: (dx / length) * scaled, y: (-dy / length) * scaled };
}

/**
 * Luong xoay may quay (rad) khi nguoi choi day can sang ngang va khong tu keo may quay: de lai bang mot ngon.
 * Toc do co gioi han va chi phu thuoc can ao, nen khong the tu quay mai nhu cach "duoi theo huong nhan vat".
 */
export function steerYaw(stick, dt, rate = 0.8) {
  return -stick.x * rate * dt;
}

/**
 * Doi can ao sang huong trong the gioi. Quy uoc: may quay dung tai target + (sin yaw, ., cos yaw) * dist,
 * nen "day len" la di ra xa may quay.
 */
export function cameraRelative(stick, camYaw) {
  const sin = Math.sin(camYaw), cos = Math.cos(camYaw);
  return { x: stick.x * cos - stick.y * sin, z: -stick.x * sin - stick.y * cos };
}
