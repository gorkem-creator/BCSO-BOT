const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const fs = require('fs');
require('dotenv').config();

// --- UYANIK TUTMA KODU (RENDER İÇİN) ---
const http = require('http');
http.createServer((req, res) => res.end("Bot Aktif!")).listen(process.env.PORT || 3000);

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMembers]
});

const mesaiTakip = new Map();
const VERITABANI_DOSYASI = './mesaiSüreleri.json';

let toplamMesailer = {};
if (fs.existsSync(VERITABANI_DOSYASI)) {
    try { toplamMesailer = JSON.parse(fs.readFileSync(VERITABANI_DOSYASI, 'utf8')); } catch (e) { toplamMesailer = {}; }
}

function veritabaniKaydet() { fs.writeFileSync(VERITABANI_DOSYASI, JSON.stringify(toplamMesailer, null, 4), 'utf8'); }

const AYARLAR = {
    MESA_GIRIS_CIKIS_KANALI: '⏰・ᴍᴇꜱᴀɪ-ɢɪʀɪş-çıᴋış',
    MESAI_LOG_KANALI: '⏰・ᴍᴇꜱᴀɪ-ʟᴏɢ',
    BASVURU_PANEL_KANALI: '📚・ʙᴀşᴠᴜʀᴜ-ꜰᴏʀᴍ',
    BASVURU_TAKIP_KANALI: '📚・ʙᴀşᴠᴜʀᴜ-ᴛᴀᴋɪᴘ'
};

client.once('ready', async () => {
    const commands = [
        new SlashCommandBuilder().setName('katıl').setDescription('Telsiz kanalına girer.'),
        new SlashCommandBuilder().setName('ayrıl').setDescription('Telsizden çıkar.'),
        new SlashCommandBuilder().setName('mesai-sistemi-kur').setDescription('Panel kurar.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        new SlashCommandBuilder().setName('başvuru-sistemi-kur').setDescription('Başvuru paneli kurar.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        new SlashCommandBuilder().setName('mesai-sıralaması').setDescription('Liderlik tablosu.'),
        new SlashCommandBuilder().setName('mesai-ekle').setDescription('Mesai ekle.').addUserOption(o => o.setName('kisi').setRequired(true)).addIntegerOption(o => o.setName('dakika').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        new SlashCommandBuilder().setName('mesai-sıfırla').setDescription('Mesai sıfırla.').addUserOption(o => o.setName('kisi').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        new SlashCommandBuilder().setName('mesai-kontrol').setDescription('Mesai kontrol.').addUserOption(o => o.setName('kisi'))
    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ BCSO | Tüm sistemler aktif!');
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const { commandName, options, user } = interaction;
        await interaction.deferReply({ ephemeral: true });

        if (commandName === 'mesai-ekle') {
            const u = options.getUser('kisi');
            const d = options.getInteger('dakika');
            toplamMesailer[u.id] = (toplamMesailer[u.id] || 0) + d;
            veritabaniKaydet();
            await interaction.editReply(`✅ ${u.username} adlı kişiye ${d} dk eklendi.`);
        } 
        else if (commandName === 'mesai-sıfırla') {
            const u = options.getUser('kisi');
            toplamMesailer[u.id] = 0;
            veritabaniKaydet();
            await interaction.editReply(`🧹 ${u.username} mesaileri sıfırlandı.`);
        }
        else if (commandName === 'mesai-kontrol') {
            const u = options.getUser('kisi') || user;
            const sure = toplamMesailer[u.id] || 0;
            await interaction.editReply(`📊 ${u.username} toplam ${sure} dakika mesai yapmış.`);
        }
        else if (commandName === 'mesai-sistemi-kur') {
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('mesai_basla').setLabel('Mesai Giriş').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('mesai_bitir').setLabel('Mesai Çıkış').setStyle(ButtonStyle.Danger));
            await interaction.channel.send({ components: [row] });
            await interaction.editReply('✅ Mesai paneli kuruldu!');
        }
    }

    if (interaction.isButton()) {
        const { customId, user, guild } = interaction;
        if (customId === 'mesai_basla') {
            mesaiTakip.set(user.id, Date.now());
            await interaction.reply({ content: '🟢 Mesai başladı!', ephemeral: true });
        } else if (customId === 'mesai_bitir') {
            if (!mesaiTakip.has(user.id)) return await interaction.reply({ content: '❌ Aktif mesain yok!', ephemeral: true });
            const sure = Math.floor((Date.now() - mesaiTakip.get(user.id)) / 60000);
            mesaiTakip.delete(user.id);
            toplamMesailer[user.id] = (toplamMesailer[user.id] || 0) + sure;
            veritabaniKaydet();
            await interaction.reply({ content: `✅ Mesai bitti. Süre: ${sure} dakika.`, ephemeral: true });
        }
    }
});

client.login(process.env.TOKEN);