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
        new SlashCommandBuilder().setName('mesai-ekle').setDescription('Personele mesai ekle.').addUserOption(o => o.setName('kisi').setRequired(true)).addIntegerOption(o => o.setName('dakika').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        new SlashCommandBuilder().setName('mesai-sıfırla').setDescription('Personel mesaisini sıfırla.').addUserOption(o => o.setName('kisi').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        new SlashCommandBuilder().setName('mesai-kontrol').setDescription('Mesai süresine bak.').addUserOption(o => o.setName('kisi'))
    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ BCSO | Tüm komutlar yüklendi!');
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const { commandName, options, user, channel } = interaction;
        await interaction.deferReply({ ephemeral: true });

        // --- YENİ EKLENEN MANTIKSAL KOMUTLAR ---
        if (commandName === 'mesai-ekle') {
            const u = options.getUser('kisi');
            const d = options.getInteger('dakika');
            toplamMesailer[u.id] = (toplamMesailer[u.id] || 0) + d;
            veritabaniKaydet();
            return await interaction.editReply(`✅ **${u.username}** adlı personele **${d} dakika** eklendi.`);
        } 
        else if (commandName === 'mesai-sıfırla') {
            const u = options.getUser('kisi');
            toplamMesailer[u.id] = 0;
            veritabaniKaydet();
            return await interaction.editReply(`🧹 **${u.username}** adlı personelin mesaileri sıfırlandı.`);
        }
        else if (commandName === 'mesai-kontrol') {
            const u = options.getUser('kisi') || user;
            const sure = toplamMesailer[u.id] || 0;
            const saat = Math.floor(sure / 60); const dak = sure % 60;
            return await interaction.editReply(`📊 **${u.username}** toplam **${saat} saat ${dak} dakika** mesai yapmış.`);
        }
        // --- DİĞER KOMUTLAR ---
        else if (commandName === 'mesai-sistemi-kur') {
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('mesai_basla').setLabel('Mesai Giriş (10-41)').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('mesai_bitir').setLabel('Mesai Çıkış (10-42)').setStyle(ButtonStyle.Danger));
            await channel.send({ content: 'BCSO Mesai Paneli:', components: [row] });
            return await interaction.editReply('✅ Mesai paneli kuruldu!');
        }
    }

    if (interaction.isButton()) {
        // ... (Eski buton kodların aynen kalmalı)
        if (interaction.customId === 'mesai_basla') {
            mesaiTakip.set(interaction.user.id, Date.now());
            await interaction.reply({ content: '🟢 Mesai başladı!', ephemeral: true });
        } else if (interaction.customId === 'mesai_bitir') {
            if (!mesaiTakip.has(interaction.user.id)) return await interaction.reply({ content: '❌ Aktif mesain yok!', ephemeral: true });
            const sure = Math.floor((Date.now() - mesaiTakip.get(interaction.user.id)) / 60000);
            mesaiTakip.delete(interaction.user.id);
            toplamMesailer[interaction.user.id] = (toplamMesailer[interaction.user.id] || 0) + sure;
            veritabaniKaydet();
            await interaction.reply({ content: `✅ Mesai bitti. Toplam: ${sure} dakika.`, ephemeral: true });
        }
    }
});

client.login(process.env.TOKEN);