const { User } = require('../models');
const storage = require('../services/storageService');
const files = require('../services/fileValidationService');
const { AppError } = require('../middleware/errorMiddleware');
const { successResponse } = require('../utils/responseUtils');

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

function validateImage(file) {
  if (!file || file.size > MAX_IMAGE_BYTES) {
    throw new AppError('L’image doit peser au plus 2 Mo.', 400, { code: 'IMAGE_TOO_LARGE' });
  }
  const valid = files.validateUpload(file.buffer, file.originalname, file.mimetype, 'knowledge');
  if (valid.category !== 'image' || !['image/jpeg', 'image/png', 'image/webp'].includes(valid.mimeType)) {
    throw new AppError('Utilisez une image JPG, PNG ou WebP.', 400, { code: 'IMAGE_TYPE_INVALID' });
  }
  return valid;
}

async function uploadLogo(req, res, next) {
  try {
    const file = validateImage(req.file);
    const key = await storage.upload(req.tenant.id, 'branding', req.file.buffer, file);
    const settings = { ...(req.tenant.settings || {}) };
    const previous = settings.branding?.logoStorageKey;
    settings.branding = { ...(settings.branding || {}), logoStorageKey: key };
    await req.tenant.update({ settings });
    if (previous) storage.remove(previous, req.tenant.id);
    successResponse(res, { logoStorageKey: key, url: await storage.createSignedUrl(key, req.tenant.id) }, 'Logo enregistré', 200, 'LOGO_SAVED');
  } catch (error) { next(error); }
}

async function uploadProfileAvatar(req, res, next) {
  try {
    const file = validateImage(req.file);
    const key = await storage.upload(req.tenant.id, 'profiles', req.file.buffer, file);
    const previous = req.user.avatarStorageKey;
    await req.user.update({ avatarStorageKey: key });
    if (previous) storage.remove(previous, req.tenant.id);
    successResponse(res, { avatarStorageKey: key, avatarUrl: await storage.createSignedUrl(key, req.tenant.id) }, 'Photo de profil enregistrée', 200, 'AVATAR_SAVED');
  } catch (error) { next(error); }
}

async function publicMedia(req, res, next) {
  try {
    const { Tenant } = require('../models');
    const tenant = await Tenant.findOne({ where: { id: req.params.tenantId, isActive: true } });
    if (!tenant) throw new AppError('Entreprise introuvable.', 404, { code: 'TENANT_NOT_FOUND' });
    const key = req.params.kind === 'logo'
      ? tenant.settings?.branding?.logoStorageKey
      : (await User.findOne({ where: { id: req.params.userId, tenantId: tenant.id } }))?.avatarStorageKey;
    if (!key) throw new AppError('Image introuvable.', 404, { code: 'IMAGE_NOT_FOUND' });
    return res.redirect(302, await storage.createSignedUrl(key, tenant.id));
  } catch (error) { next(error); }
}

module.exports = { uploadLogo, uploadProfileAvatar, publicMedia };
