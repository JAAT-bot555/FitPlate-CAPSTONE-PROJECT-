function createError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function ensureFound(doc, message = 'Not found') {
  if (!doc) {
    throw createError(message, 404);
  }
  return doc;
}

function pickFields(source, allowedKeys) {
  const result = {};
  for (const key of allowedKeys) {
    if (source[key] !== undefined) {
      result[key] = source[key];
    }
  }
  return result;
}

module.exports = {
  createError,
  ensureFound,
  pickFields,
};
