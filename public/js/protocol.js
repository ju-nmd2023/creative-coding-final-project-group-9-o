/**
 * Binary Protocol for Sensor Data
 *
 * Message Structure (Musician -> Server -> Conductor):
 * - UUID: 36 bytes (ASCII string, fixed length) - prepended by server
 * - Flags: 1 byte
 *   - Bit 0: tracking (touching screen)
 *   - Bit 1: shaking
 *   - Bits 2-7: reserved for future features
 * - Velocity X: 4 bytes (float32)
 * - Velocity Y: 4 bytes (float32)
 * - Velocity Z: 4 bytes (float32)
 * - Acceleration X: 4 bytes (float32)
 * - Acceleration Y: 4 bytes (float32)
 * - Acceleration Z: 4 bytes (float32)
 * - Orientation Alpha: 4 bytes (float32)
 * - Orientation Beta: 4 bytes (float32)
 * - Orientation Gamma: 4 bytes (float32)
 *
 * Total: 73 bytes (36 UUID + 1 flags + 36 sensor data)
 *
 * Client sends: 37 bytes (flags + sensor data)
 * Server adds UUID and forwards: 73 bytes
 */

export const MESSAGE_SIZE = 37;
export const MESSAGE_WITH_ID_SIZE = 73;
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

  // Velocity
  view.setFloat32(offset, state.velocity.x, true); offset += 4;
  view.setFloat32(offset, state.velocity.y, true); offset += 4;
  view.setFloat32(offset, state.velocity.z, true); offset += 4;

  // Acceleration
  view.setFloat32(offset, state.acceleration.x, true); offset += 4;
  view.setFloat32(offset, state.acceleration.y, true); offset += 4;
  view.setFloat32(offset, state.acceleration.z, true); offset += 4;

  // Orientation
  view.setFloat32(offset, state.orientation.alpha, true); offset += 4;
  view.setFloat32(offset, state.orientation.beta, true); offset += 4;
  view.setFloat32(offset, state.orientation.gamma, true); offset += 4;

  return buffer;
}

/**
 * Decode sensor data from binary format (conductor-side)
 * @param {ArrayBuffer} buffer - Binary message with prepended UUID
 * @returns {Object} - { musicianId, tracking, shaking, velocity, acceleration, orientation }
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
  const velocity = {
    x: view.getFloat32(offset, true),
    y: view.getFloat32(offset + 4, true),
    z: view.getFloat32(offset + 8, true)
  };
  offset += 12;

  const acceleration = {
    x: view.getFloat32(offset, true),
    y: view.getFloat32(offset + 4, true),
    z: view.getFloat32(offset + 8, true)
  };
  offset += 12;

  const orientation = {
    alpha: view.getFloat32(offset, true),
    beta: view.getFloat32(offset + 4, true),
    gamma: view.getFloat32(offset + 8, true)
  };

  return {
    musicianId,
    tracking,
    shaking,
    velocity,
    acceleration,
    orientation
  };
}
