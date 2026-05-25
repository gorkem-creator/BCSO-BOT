const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.on('ready', () => console.log(`${client.user.tag} aktif!`));

// --- MESAİ & BAŞVURU PANELİ KURMA ---
client.on('messageCreate', async (message) => {
    if (message.content === '!kurulum') {
        const embed = new EmbedBuilder().setTitle("BCSO").setDescription("Mesaide değilken botu açık bırakmanız mesainizin sıfırlanması ve strike 1 yemenizle sonuçlanır.").setImage("https://media.discordapp.net/attachments/1498313566015717446/1498797722365460683/image.png");
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('giris').setLabel('Mesai Giriş').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('cikis').setLabel('Mesai Çıkış').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('basvuru').setLabel('Başvuru Yap').setStyle(ButtonStyle.Primary)
        );
        message.channel.send({ embeds: [embed], components: [row] });
    }
});

// --- BUTON VE MODAL İŞLEMLERİ ---
client.on('interactionCreate', async (i) => {
    if (i.isButton()) {
        if (i.customId === 'giris') {
            await db.set(`mesai_durum_${i.user.id}`, Date.now());
            i.reply({ content: "Mesaiye giriş yapıldı!", ephemeral: true });
            i.guild.channels.cache.find(c => c.name === '⏰・ᴍᴇꜱᴀɪ-ʟᴏɢ').send(`${i.user.tag} mesaiye başladı: ${new Date().toLocaleTimeString()}`);
        }
        if (i.customId === 'cikis') {
            const start = await db.get(`mesai_durum_${i.user.id}`);
            if (!start) return i.reply({ content: "Önce mesaiye giriş yapmalısın!", ephemeral: true });
            const duration = Math.floor((Date.now() - start) / 60000);
            await db.add(`toplam_mesai_${i.user.id}`, duration);
            await db.delete(`mesai_durum_${i.user.id}`);
            i.reply({ content: `Çıkış yapıldı! Toplam ${duration} dakika mesai eklendi.`, ephemeral: true });
        }
        if (i.customId === 'basvuru') {
            const modal = new ModalBuilder().setCustomId('form').setTitle('BCSO Başvuru');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q1').setLabel('OOC/IC İsim Yaş').setStyle(TextInputStyle.Paragraph)));
            await i.showModal(modal);
        }
    }
});

// --- KOMUTLAR ---
client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) return;
    if (i.commandName === 'mesai-ekle') {
        const target = i.options.getUser('kişi');
        const min = i.options.getInteger('dakika');
        await db.add(`toplam_mesai_${target.id}`, min);
        i.reply(`${target.username} kişisine ${min} dakika mesai eklendi.`);
    }
    // Diğer komutlar (kontrol/sıfırla) benzer mantıkla buraya eklenecek
});

client.login('MTUwNzg3ODY0NDEzMzkyMDg4OQ.GFD8LG.YE9s5TDN9I1UdCktL9HziDKdOCmlVAwaMcnEWM');
