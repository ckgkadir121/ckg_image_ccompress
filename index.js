const { Telegraf } = require('telegraf');
console.log("Bot starting...");
const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const bot = new Telegraf('7578206722:AAHN9wKJaIwJX2bf7u6N3HiEyUMTnlrYZ_E');

bot.start((ctx) => ctx.reply('Assalamu Alaikum! Mujhe image bhejo aur bolo "Compress to 500 KB" ya "Compress to 1 MB"'));

let userTargets = {};

bot.on('photo', async (ctx) => {
  const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
  const fileLink = await ctx.telegram.getFileLink(fileId);

  const userId = ctx.from.id;
  ctx.reply('Image mil gayi! Ab mujhe bolo: "Compress to 500 KB" ya "Compress to 1 MB"');

  userTargets[userId] = { imageUrl: fileLink.href };
});

bot.hears(/compress to (\d+)\s*(KB|MB)/i, async (ctx) => {
  const userId = ctx.from.id;
  if (!userTargets[userId] || !userTargets[userId].imageUrl) {
    return ctx.reply('Pehle mujhe image bhejo!');
  }

  const targetSize = parseInt(ctx.match[1]);
  const unit = ctx.match[2].toUpperCase();
  const targetKB = unit === 'MB' ? targetSize * 1024 : targetSize;

  ctx.reply(`Compress kar raha hoon... Target: ${targetKB} KB`);

  try {
    const response = await axios.get(userTargets[userId].imageUrl, { responseType: 'arraybuffer' });
    let imageBuffer = Buffer.from(response.data);

    let quality = 80;
    let compressedBuffer = imageBuffer;

    while (true) {
      compressedBuffer = await sharp(imageBuffer)
        .jpeg({ quality })
        .toBuffer();

      const currentKB = Math.round(compressedBuffer.length / 1024);
      console.log(`Current size: ${currentKB} KB (Quality: ${quality}%)`);

      if (currentKB <= targetKB || quality <= 10) {
        break;
      }

      quality -= 5;
    }

    const filePath = path.join(__dirname, `compressed_${userId}.jpg`);
    fs.writeFileSync(filePath, compressedBuffer);

    await ctx.replyWithPhoto({ source: filePath }, { caption: `Done! Final size: ${Math.round(compressedBuffer.length / 1024)} KB` });

    fs.unlinkSync(filePath); // Delete after sending
    delete userTargets[userId];

  } catch (error) {
    console.error(error);
    ctx.reply('Kuch galat ho gaya! Dobara try karo.');
  }
});

bot.launch();
