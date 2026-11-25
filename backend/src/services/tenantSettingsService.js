const { AppError } = require('../middleware/errorMiddleware');

const EDITABLE_FIELDS = ['name', 'domain', 'subdomain'];

class TenantSettingsService {
  /**
   * Ne retient que les champs réellement transmis. On teste la présence de la
   * clé et non sa véracité : une chaîne vide est une demande d'effacement, que
   * le hook beforeValidate du modèle Tenant convertit en null.
   */
  buildUpdatePayload(body) {
    return Object.fromEntries(
      EDITABLE_FIELDS
        .filter((field) => body[field] !== undefined)
        .map((field) => [field, body[field]])
    );
  }

  async updateSettings(tenant, body, locale = 'fr') {
    try {
      await tenant.update(this.buildUpdatePayload(body));
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw this.buildConflictError(error, locale);
      }
      throw error;
    }

    return {
      id: tenant.id,
      name: tenant.name,
      domain: tenant.domain,
      subdomain: tenant.subdomain,
    };
  }

  // Le libellé du champ en conflit (« Ce sous-domaine »/« Ce site web ») est
  // dynamique : MESSAGES[code] ne peut porter qu'un texte figé par code, donc
  // translate() écraserait cette partie. On résout le texte localisé ici et
  // on le marque preTranslated pour que errorHandler le renvoie tel quel, en
  // gardant code: 'TENANT_FIELD_ALREADY_USED' stable pour le client.
  buildConflictError(error, locale = 'fr') {
    const isEn = locale === 'en';
    const field = error.errors?.[0]?.path === 'domain' ? 'domain' : 'subdomain';
    const label = isEn
      ? (field === 'domain' ? 'This website' : 'This subdomain')
      : (field === 'domain' ? 'Ce site web' : 'Ce sous-domaine');
    const message = isEn
      ? `${label} is already used by another company`
      : `${label} est déjà utilisé par une autre entreprise`;
    return new AppError(message, 409, {
      code: 'TENANT_FIELD_ALREADY_USED',
      preTranslated: true,
    });
  }
}

module.exports = new TenantSettingsService();
