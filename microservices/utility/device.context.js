/**
 * Parses a device_info value (JSON string or object) and merges it with an
 * optional fallback object, returning a consistently-shaped device context.
 *
 * @param {string|object} deviceInfo - Serialised JSON string or plain object.
 * @param {object} [fallback={}]     - Additional fields to fill gaps.
 * @returns {{
 *   device_name: string,
 *   device_info: string,
 *   webgl_fingerprint: string,
 *   finger_print: string,
 *   ip_address: string,
 *   user_agent: string,
 *   device_id_hash: string,
 * }}
 */
export function normalizeDeviceContext(deviceInfo, fallback = {}) {
  let parsed = {};

  if (typeof deviceInfo === "string") {
    try {
      parsed = JSON.parse(deviceInfo);
    } catch {
      parsed = {};
    }
  } else if (deviceInfo && typeof deviceInfo === "object") {
    parsed = deviceInfo;
  }

  const device_name =
    parsed.device_name ||
    parsed.device_info ||
    fallback.device_name ||
    fallback.device_info ||
    "";

  const webgl_fingerprint =
    parsed.webgl_fingerprint ||
    parsed.finger_print ||
    fallback.webgl_fingerprint ||
    fallback.finger_print ||
    fallback.fp_hash ||
    "";

  const ip_address =
    parsed.ip_address || fallback.ip_address || "";

  const user_agent =
    parsed.user_agent || fallback.user_agent || "";

  const device_id_hash =
    parsed.device_id_hash || fallback.device_id_hash || "";

  return {
    device_name,
    device_info: device_name,
    webgl_fingerprint,
    finger_print: webgl_fingerprint,
    ip_address,
    user_agent,
    device_id_hash,
  };
}

/**
 * Extracts the device-related claims to embed inside a JWT.
 *
 * @param {object} deviceContext - Normalised device context.
 * @returns {object}
 */
export function claimsFromDeviceContext(deviceContext) {
  return {
    device_info: deviceContext.device_info || deviceContext.device_name || "",
    ip_address: deviceContext.ip_address || "",
    webgl_fingerprint: deviceContext.webgl_fingerprint || deviceContext.finger_print || "",
    user_agent: deviceContext.user_agent || "",
    device_id_hash: deviceContext.device_id_hash || "",
  };
}

/**
 * Builds a device context from an Express request object combined with a
 * payload (e.g. JWT claims or request body fields).
 *
 * @param {import('express').Request} req
 * @param {object} [payload={}]
 * @returns {object}
 */
export function buildRequestDeviceContext(req, payload = {}) {
  const requestIp =
    req.ip ||
    (req.headers && req.headers["x-forwarded-for"]) ||
    "";

  const requestUserAgent =
    (req.headers && req.headers["user-agent"]) || "";

  return normalizeDeviceContext(payload.device_info || payload, {
    ip_address: requestIp,
    user_agent: requestUserAgent,
    webgl_fingerprint: payload.webgl_fingerprint || payload.finger_print || payload.fp_hash || "",
    device_id_hash: payload.device_id_hash || "",
  });
}

/**
 * Asserts that the device context captured from the current HTTP request
 * matches the context embedded in a verified token payload.  Throws an error
 * when the contexts do not match, which callers can treat as an authentication
 * failure.
 *
 * @param {object} requestContext - Context built from the current request.
 * @param {object} tokenPayload   - Claims from a verified JWT.
 * @throws {Error} When the IP address or fingerprint does not match.
 */
export function assertMatchingDeviceContext(requestContext, tokenPayload) {
  const tokenIp = tokenPayload.ip_address || "";
  const requestIp = requestContext.ip_address || "";

  if (tokenIp && requestIp && tokenIp !== requestIp) {
    throw new Error("Device context mismatch: IP address does not match");
  }

  const tokenFingerprint =
    tokenPayload.webgl_fingerprint || tokenPayload.finger_print || "";
  const requestFingerprint =
    requestContext.webgl_fingerprint || requestContext.finger_print || "";

  if (
    tokenFingerprint &&
    requestFingerprint &&
    tokenFingerprint !== requestFingerprint
  ) {
    throw new Error("Device context mismatch: fingerprint does not match");
  }
}
