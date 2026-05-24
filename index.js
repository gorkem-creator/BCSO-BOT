const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const fs = require('fs');
require('dotenv').config();

// --- UYANIK TUTMA KODU ---
const http = require('http');
http.createServer((req, res) => { res.write("Bot aktif!"); res.end(); }).listen(process.env.PORT || 3000);

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
    BASVURU_TAKIP_KANALI: '📚・ʙᴀşᴠᴜʀᴜ-ᴛᴀᴋɪᴘ',
    DEPARTMAN_LOGOSU: 'https://media.discordapp.net/attachments/1498313566015717446/1498797722365460683/image.png',
    KUCUK_LOGO: 'https://media.discordapp.net/attachments/1438149589667545125/1497790266076299305/Logo_BCSO.png'
};

client.once('ready', async () => {
    const commands = [
        new SlashCommandBuilder().setName('katıl').setDescription('Telsiz kanalına girer.'),
        new SlashCommandBuilder().setName('ayrıl').setDescription('Telsizden çıkar.'),
        new SlashCommandBuilder().setName('sil').setDescription('Mesaj siler.').addIntegerOption(o => o.setName('miktar').setRequired(true)),
        new SlashCommandBuilder().setName('mesai-sistemi-kur').setDescription('Panel kurar.'),
        new SlashCommandBuilder().setName('başvuru-sistemi-kur').setDescription('Başvuru paneli kurar.'),
        new SlashCommandBuilder().setName('mesai-sıralaması').setDescription('Mesai listesi.'),
        new SlashCommandBuilder().setName('mesai-ekle').setDescription('Mesai ekle').addUserOption(o => o.setName('kisi').setRequired(true)).addIntegerOption(o => o.setName('dakika').setRequired(true)),
        new SlashCommandBuilder().setName('mesai-sıfırla').setDescription('Mesai sıfırla').addUserOption(o => o.setName('kisi').setRequired(true)),
        new SlashCommandBuilder().setName('mesai-kontrol').setDescription('Mesai kontrol').addUserOption(o => o.setName('kisi'))
    ].map(cmd => cmd.toJSON());
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ BCSO | Tüm sistem aktif!');
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const { commandName, options, user, channel, guild, member } = interaction;
        await interaction.deferReply({ ephemeral: true });

        if (commandName === 'mesai-ekle') {
            const u = options.getUser('kisi');
            const d = options.getInteger('dakika');
            toplamMesailer[u.id] = (toplamMesailer[u.id] || 0) + d;
            veritabaniKaydet();
            return await interaction.editReply(`✅ **${u.username}** adlı kişiye **${d} dk** eklendi.`);
        }
        if (commandName === 'mesai-sıfırla') {
            const u = options.getUser('kisi');
            toplamMesailer[u.id] = 0;
            veritabaniKaydet();
            return await interaction.editReply(`🧹 **${u.username}** mesaileri sıfırlandı.`);
        }
        if (commandName === 'mesai-kontrol') {
            const u = options.getUser('kisi') || user;
            const sure = toplamMesailer[u.id] || 0;
            return await interaction.editReply(`📊 **${u.username}** toplam **${sure} dakika** mesai yapmış.`);
        }
        if (commandName === 'katıl') {
            const v = member.voice.channel;
            if (!v) return await interaction.editReply('❌ Ses kanalında değilsin.');
            joinVoiceChannel({ channelId: v.id, guildId: guild.id, adapterCreator: guild.voiceAdapterCreator });
            await interaction.editReply('🔊 Telsize bağlanıldı.');
        }
        if (commandName === 'mesai-sistemi-kur') {
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('mesai_basla').setLabel('Mesai Giriş').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('mesai_bitir').setLabel('Mesai Çıkış').setStyle(ButtonStyle.Danger));
            await channel.send({ content: 'Mesai Paneli:', components: [row] });
            await interaction.editReply('✅ Panel kuruldu.');
        }
    }

    if (interaction.isButton()) {
        const { customId, user, guild, message } = interaction;
        if (customId === 'basvuru_formu_ac') {
            const modal = new ModalBuilder().setCustomId('bcso_basvuru_modali').setTitle('BCSO Memur Başvuru Formu');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('b_isim').setLabel('İsim/Yaş').setStyle(TextInputStyle.Short).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('b_aktiflik').setLabel('Aktiflik').setStyle(TextInputStyle.Short).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('b_tecrube').setLabel('Tecrübe').setStyle(TextInputStyle.Paragraph).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('b_neden').setLabel('Neden?').setStyle(TextInputStyle.Paragraph).setRequired(true)));
            return await interaction.showModal(modal);
        }
        if (customId === 'basvuru_onayla') {
            const embed = EmbedBuilder.from(message.embeds[0]).setColor('#2B9348').setTitle('✅ BAŞVURU KABUL EDİLDİ');
            await message.edit({ embeds: [embed], components: [] });
            await interaction.reply({ content: '✅ Kabul edildi.', ephemeral: true });
        }
        if (customId === 'basvuru_reddet') {
            const embed = EmbedBuilder.from(message.embeds[0]).setColor('#E63946').setTitle('❌ BAŞVURU REDDEDİLDİ');
            await message.edit({ embeds: [embed], components: [] });
            await interaction.reply({ content: '❌ Reddedildi.', ephemeral: true });
        }
        if (customId === 'mesai_basla') {
            mesaiTakip.set(user.id, Date.now());
            await interaction.reply({ content: '🟢 Mesai başladı.', ephemeral: true });
        } else if (customId === 'mesai_bitir') {
            if (!mesaiTakip.has(user.id)) return await interaction.reply({ content: '❌ Aktif mesain yok.', ephemeral: true });
            const sure = Math.floor((Date.now() - mesaiTakip.get(user.id)) / 60000);
            mesaiTakip.delete(user.id);
            toplamMesailer[user.id] = (toplamMesailer[user.id] || 0) + sure;
            veritabaniKaydet();
            await interaction.reply({ content: `✅ Mesai bitti: ${sure} dakika.`, ephemeral: true });
        }
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'bcso_basvuru_modali') {
            const takipKanali = interaction.guild.channels.cache.find(ch => ch.name.toLowerCase().includes(AYARLAR.BASVURU_TAKIP_KANALI.toLowerCase()));
            if (!takipKanali) return await interaction.reply({ content: '❌ Takip kanalı bulunamadı!', ephemeral: true });
            const formEmbed = new EmbedBuilder().setColor('#F4A261').setTitle('📯 YENİ BAŞVURU!').setDescription(`**Başvuru Sahibi:** ${interaction.user}`).addFields({ name: '📝 İsim', value: interaction.fields.getTextInputValue('b_isim') }, { name: '⏰ Aktiflik', value: interaction.fields.getTextInputValue('b_aktiflik') }, { name: '🛡️ Tecrübe', value: interaction.fields.getTextInputValue('b_tecrube') }, { name: '🤠 Neden', value: interaction.fields.getTextInputValue('b_neden') });
            const yonetimRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('basvuru_onayla').setLabel('Onayla').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('basvuru_reddet').setLabel('Reddet').setStyle(ButtonStyle.Danger));
            await takipKanali.send({ embeds: [formEmbed], components: [yonetimRow] });
            await interaction.reply({ content: '✅ Başvurunuz alındı.', ephemeral: true });
        }
    }
});

client.login(process.env.TOKEN);
