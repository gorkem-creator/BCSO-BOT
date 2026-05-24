const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const fs = require('fs');
require('dotenv').config();

// --- UYANIK TUTMA KODU (RENDER İÇİN) ---
const http = require('http');
http.createServer((req, res) => {
  res.write("Bot aktif!");
  res.end();
}).listen(process.env.PORT || 3000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers 
    ]
});

const mesaiTakip = new Map();
const VERITABANI_DOSYASI = './mesaiSüreleri.json';

let toplamMesailer = {};
if (fs.existsSync(VERITABANI_DOSYASI)) {
    try {
        toplamMesailer = JSON.parse(fs.readFileSync(VERITABANI_DOSYASI, 'utf8'));
    } catch (e) { toplamMesailer = {}; }
}

function veritabaniKaydet() {
    fs.writeFileSync(VERITABANI_DOSYASI, JSON.stringify(toplamMesailer, null, 4), 'utf8');
}

const AYARLAR = {
    MESA_GIRIS_CIKIS_KANALI: '⏰・ᴍᴇꜱᴀɪ-ɢɪʀɪş-çıᴋış',
    MESAI_LOG_KANALI: '⏰・ᴍᴇꜱᴀɪ-ʟᴏɢ',
    BASVURU_PANEL_KANALI: '📚・ʙᴀşᴠᴜʀᴜ-ꜰᴏʀᴍ',
    BASVURU_TAKIP_KANALI: '📚・ʙᴀşᴠᴜʀᴜ-ᴛᴀᴋɪᴘ',
    DEPARTMAN_LOGOSU: 'https://media.discordapp.net/attachments/1498313566015717446/1498797722365460683/image.png?ex=6a1415e7&is=6a12c467&hm=b44f1946156353002d8bc2560f0d33a82802c86bf01830f07cf18011f417af2c&=&format=webp&quality=lossless&width=1872&height=761',
    KUCUK_LOGO: 'https://media.discordapp.net/attachments/1438149589667545125/1497790266076299305/Logo_BCSO.png?ex=6a146023&is=6a130ea3&hm=e605f37ade63dd9136798b2dca2dec2d10d50c679bb6c89898e84209fb88ab06&=&format=webp&quality=lossless'        
};

client.once('ready', async () => {
    const commands = [
        new SlashCommandBuilder().setName('katıl').setDescription('Telsiz kanalına girer.'),
        new SlashCommandBuilder().setName('ayrıl').setDescription('Telsizden çıkar.'),
        new SlashCommandBuilder().setName('mesai-sistemi-kur').setDescription('Panel kurar.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        new SlashCommandBuilder().setName('mesai-ekle').setDescription('Mesai ekler.').addUserOption(o => o.setName('kisi').setRequired(true)).addIntegerOption(o => o.setName('dakika').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        new SlashCommandBuilder().setName('mesai-sıfırla').setDescription('Mesai sıfırlar.').addUserOption(o => o.setName('kisi').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        new SlashCommandBuilder().setName('mesai-kontrol').setDescription('Mesaiyi kontrol eder.').addUserOption(o => o.setName('kisi')),
        new SlashCommandBuilder().setName('başvuru-sistemi-kur').setDescription('Başvuru panelini kurar.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log(`⭐ BCSO | Sistem Tamamen Aktif!`);
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        await interaction.deferReply({ ephemeral: true });
        const { commandName, options, guild, member, channel, user } = interaction;

        if (commandName === 'mesai-ekle') {
            const u = options.getUser('kisi');
            const d = options.getInteger('dakika');
            toplamMesailer[u.id] = (toplamMesailer[u.id] || 0) + d;
            veritabaniKaydet();
            await interaction.editReply(`✅ **${u.username}** adlı personele **${d} dakika** eklendi.`);
        }
        else if (commandName === 'mesai-sıfırla') {
            const u = options.getUser('kisi');
            toplamMesailer[u.id] = 0;
            veritabaniKaydet();
            await interaction.editReply(`🧹 **${u.username}** mesaileri sıfırlandı.`);
        }
        else if (commandName === 'mesai-kontrol') {
            const u = options.getUser('kisi') || user;
            const sure = toplamMesailer[u.id] || 0;
            const saat = Math.floor(sure / 60); const dak = sure % 60;
            await interaction.editReply(`📊 **${u.username}** toplam **${saat} saat ${dak} dakika** mesai yapmış.`);
        }
        else if (commandName === 'mesai-sistemi-kur') {
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('mesai_basla').setLabel('Mesai Giriş (10-41)').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('mesai_bitir').setLabel('Mesai Çıkış (10-42)').setStyle(ButtonStyle.Danger));
            await channel.send({ content: 'BCSO Mesai Paneli:', components: [row] }); await interaction.editReply('✅ Kuruldu.');
        }
        else if (commandName === 'başvuru-sistemi-kur') {
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('basvuru_formu_ac').setLabel('Başvuru Yap').setStyle(ButtonStyle.Primary));
            await channel.send({ content: 'BCSO Başvuru Paneli:', components: [row] }); await interaction.editReply('✅ Kuruldu.');
        }
    }

    if (interaction.isButton()) {
        if (interaction.customId === 'mesai_basla') {
            mesaiTakip.set(interaction.user.id, Date.now());
            await interaction.reply({ content: '🟢 Mesai başladı!', ephemeral: true });
        } else if (interaction.customId === 'mesai_bitir') {
            if (!mesaiTakip.has(interaction.user.id)) return await interaction.reply({ content: '❌ Aktif mesain yok!', ephemeral: true });
            const sure = Math.floor((Date.now() - mesaiTakip.get(interaction.user.id)) / 60000);
            mesaiTakip.delete(interaction.user.id);
            toplamMesailer[interaction.user.id] = (toplamMesailer[interaction.user.id] || 0) + sure;
            veritabaniKaydet();
            
            const mLogKanal = interaction.guild.channels.cache.find(c => c.name.includes(AYARLAR.MESAI_LOG_KANALI));
            if (mLogKanal) await mLogKanal.send(`🔴 **${interaction.user.username}** mesaiyi bitirdi. Süre: ${sure} dakika.`);
            await interaction.reply({ content: `✅ Mesai bitti. Toplam: ${sure} dakika.`, ephemeral: true });
        } else if (interaction.customId === 'basvuru_formu_ac') {
            const modal = new ModalBuilder().setCustomId('bcso_basvuru').setTitle('Başvuru Formu');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('b_isim').setLabel('İsim/Yaş').setStyle(TextInputStyle.Short).setRequired(true)));
            await interaction.showModal(modal);
        }
    }
});

client.login(process.env.TOKEN);