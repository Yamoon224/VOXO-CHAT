const sharp = require('sharp');
const visionService = require('./visionService');

async function readableImage() {
  return sharp({
    create: {
      width: 32,
      height: 32,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  }).png().toBuffer();
}

describe('visionService', () => {
  test('considère une image décodable sans texte comme lisible', async () => {
    const result = await visionService.buildUserContent('', [await readableImage()]);

    expect(result).toMatchObject({
      hasReadableImage: true,
      visionUsed: true,
      unreadableCount: 0,
    });
    expect(result.content[1].image_url.url).toMatch(/^data:image\/jpeg;base64,/);
  });

  test('refuse une image tronquée malgré une signature PNG valide', async () => {
    const truncated = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    await expect(visionService.buildUserContent('Analyse', [truncated]))
      .rejects.toMatchObject({ code: 'IMAGE_UNREADABLE', statusCode: 422 });
  });
});
