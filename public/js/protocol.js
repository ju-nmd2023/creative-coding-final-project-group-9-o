/**
 * Binary Protocol for Sensor Data
 *
 * Message Structure (Musician -> Server -> Stage):
 * - UUID: 36 bytes (ASCII string, fixed length) - prepended by server
 * - Flags: 1 byte
 *   - Bit 0: tracking (touching screen)
 *   - Bit 1: shaking
 *   - Bits 2-7: reserved for future features
 * - Acceleration X: 4 bytes (float32)
 * - Acceleration Y: 4 bytes (float32)
 * - Acceleration Z: 4 bytes (float32)
 * - Rotation Rate Alpha: 4 bytes (float32) - deg/s around Z
 * - Rotation Rate Beta: 4 bytes (float32) - deg/s around X
 * - Rotation Rate Gamma: 4 bytes (float32) - deg/s around Y
 * - Quaternion X: 4 bytes (float32)
 * - Quaternion Y: 4 bytes (float32)
 * - Quaternion Z: 4 bytes (float32)
 * - Quaternion W: 4 bytes (float32)
 * - Mic level: 4 bytes (float32)
 *
 * Total: 81 bytes (36 UUID + 1 flags + 44 sensor data)
 *
 * Client sends: 45 bytes (flags + sensor data)
 * Server adds UUID and forwards: 81 bytes
 */

export const MESSAGE_SIZE = 45;
export const MESSAGE_WITH_ID_SIZE = 81;
export const UUID_SIZE = 36;

// Flag bit positions
export const FLAG_TRACKING = 0;
export const FLAG_SHAKING = 1;

/**
 * Encode sensor data to binary format (client-side)
 * @param {Object} state - Sensor state from MotionTracker
 * @param {boolean} isShaking - Whether device is shaking
 * @returns {ArrayBuffer}
 */
export function encodeSensorData(state, isShaking = false) {
  const buffer = new ArrayBuffer(MESSAGE_SIZE);
  const view = new DataView(buffer);

  // Flags byte
  let flags = 0;
  if (state.tracking) flags |= (1 << FLAG_TRACKING);
  if (isShaking) flags |= (1 << FLAG_SHAKING);
  view.setUint8(0, flags);

  let offset = 1;

  // Acceleration
  view.setFloat32(offset, state.acceleration.x, true); offset += 4;
  view.setFloat32(offset, state.acceleration.y, true); offset += 4;
  view.setFloat32(offset, state.acceleration.z, true); offset += 4;

  // Rotation Rate (deg/s)
  view.setFloat32(offset, state.rotationRate.alpha, true); offset += 4;
  view.setFloat32(offset, state.rotationRate.beta, true); offset += 4;
  view.setFloat32(offset, state.rotationRate.gamma, true); offset += 4;

  // Quaternion
  view.setFloat32(offset, state.quaternion.x, true); offset += 4;
  view.setFloat32(offset, state.quaternion.y, true); offset += 4;
  view.setFloat32(offset, state.quaternion.z, true); offset += 4;
  view.setFloat32(offset, state.quaternion.w, true); offset += 4;

  // Mic volume
  view.setFloat32(offset, state.blowingStrength ?? 0, true); offset += 4;

  return buffer;
}

/**
 * Decode sensor data from binary format (stage-side)
 * @param {ArrayBuffer} buffer - Binary message with prepended UUID
 * @returns {Object} - { musicianId, tracking, shaking, acceleration, rotationRate, quaternion }
 */
export function decodeSensorData(buffer) {
  const view = new DataView(buffer);

  // Extract musician ID (first 36 bytes)
  const idBytes = new Uint8Array(buffer, 0, UUID_SIZE);
  const musicianId = new TextDecoder().decode(idBytes);

  // Extract flags
  const flags = view.getUint8(UUID_SIZE);
  const tracking = !!(flags & (1 << FLAG_TRACKING));
  const shaking = !!(flags & (1 << FLAG_SHAKING));

  let offset = UUID_SIZE + 1;

  // Extract sensor data
  const acceleration = {
    x: view.getFloat32(offset, true),
    y: view.getFloat32(offset + 4, true),
    z: view.getFloat32(offset + 8, true)
  };
  offset += 12;

  const rotationRate = {
    alpha: view.getFloat32(offset, true),
    beta: view.getFloat32(offset + 4, true),
    gamma: view.getFloat32(offset + 8, true)
  };
  offset += 12;

  const quaternion = {
    x: view.getFloat32(offset, true),
    y: view.getFloat32(offset + 4, true),
    z: view.getFloat32(offset + 8, true),
    w: view.getFloat32(offset + 12, true)
  };
  offset += 16;

  const blowingStrength = view.getFloat32(offset, true);

  return {
    musicianId,
    tracking,
    shaking,
    acceleration,
    rotationRate,
    quaternion,
    blowingStrength
  };
}
