const models = require('./index');

describe('CrawlJob associations', () => {
  test('defines each CrawlJob relation with a unique alias', () => {
    expect(models.Tenant.associations.crawlJobs.target).toBe(models.CrawlJob);
    expect(models.CrawlJob.associations.tenant.target).toBe(models.Tenant);
    expect(models.CrawlJob.associations.creator.target).toBe(models.User);
    expect(models.CrawlJob.associations.documents.target).toBe(models.KnowledgeBase);
    expect(models.KnowledgeBase.associations.crawlJob.target).toBe(models.CrawlJob);
  });
});
