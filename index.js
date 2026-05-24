const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const fs = require('fs');
require('dotenv').config();

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
    DEPARTMAN_LOGOSU: 'https://media.discordapp.net/attachments/1498313566015717446/1498797722365460683/image.png'
};

client.once('ready', async () => {
    const commands = [
        new SlashCommandBuilder().setName('katıl').setDescription('Botu ses kanalına çağırır.'),
        new SlashCommandBuilder().setName('ayrıl').setDescription('Botu ses kanalından çıkarır.'),
        new SlashCommandBuilder().setName('sil').setDescription('Mesaj siler.').addIntegerOption(o => o.setName('miktar').setDescription('Silinecek miktar').setRequired(true)),
        new SlashCommandBuilder().setName('mesai-sistemi-kur').setDescription('Mesai panelini kurar.'),
        new SlashCommandBuilder().setName('başvuru-sistemi-kur').setDescription('Başvuru panelini kurar.'),
        new SlashCommandBuilder().setName('mesai-sıralaması').setDescription('Mesai listesini gösterir.'),
        new SlashCommandBuilder().setName('mesai-ekle').setDescription('Mesai ekler.').addUserOption(o => o.setName('kisi').setDescription('Kişi').setRequired(true)).addIntegerOption(o => o.setName('dakika').setDescription('Dakika').setRequired(true)),
        new SlashCommandBuilder().setName('mesai-sıfırla').setDescription('Mesai sıfırlar.').addUserOption(o => o.setName('kisi').setDescription('Kişi').setRequired(true)),
        new SlashCommandBuilder().setName('mesai-kontrol').setDescription('Mesaiyi kontrol eder.').addUserOption(o => o.setName('kisi').setDescription('Kişi'))
    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ BCSO | Sistem Aktif!');
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const { commandName, options, user, channel, member, guild } = interaction;
        await interaction.deferReply({ ephemeral: true });

        if (commandName === 'mesai-ekle') {
            const u = options.getUser('kisi');
            const d = options.getInteger('dakika');
            toplamMesailer[u.id] = (toplamMesailer[u.id] || 0) + d;
            veritabaniKaydet();
            await interaction.editReply(`✅ **${u.username}** adlı kişiye ${d} dk eklendi.`);
        } 
        else if (commandName === 'mesai-sıfırla') {
            const u = options.getUser('kisi');
            toplamMesailer[u.id] = 0;
            veritabaniKaydet();
            await interaction.editReply(`🧹 **${u.username}** mesaileri sıfırlandı.`);
        }
        else if (commandName === 'mesai-kontrol') {
            const u = options.getUser('kisi') || user;
            await interaction.editReply(`📊 **${u.username}** toplam ${toplamMesailer[u.id] || 0} dakika mesai yapmış.`);
        }
        else if (commandName === 'mesai-sistemi-kur') {
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('mesai_basla').setLabel('10-41').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('mesai_bitir').setLabel('10-42').setStyle(ButtonStyle.Danger));
            await channel.send({ content: 'Mesai Paneli:', components: [row] });
            await interaction.editReply('✅ Panel kuruldu.');
        }
        else if (commandName === 'başvuru-sistemi-kur') {
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('basvuru_formu_ac').setLabel('Başvuru Yap').setStyle(ButtonStyle.Primary));
            await channel.send({ content: 'Başvuru Paneli:', components: [row] });
            await interaction.editReply('✅ Panel kuruldu.');
        }
    }

    if (interaction.isButton()) {
        if (interaction.customId === 'basvuru_formu_ac') {
            const modal = new ModalBuilder().setCustomId('bcso_basvuru_modali').setTitle('Başvuru');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('b_isim').setLabel('İsim/Yaş').setStyle(TextInputStyle.Short).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('b_aktiflik').setLabel('Aktiflik').setStyle(TextInputStyle.Short).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('b_tecrube').setLabel('Tecrübe').setStyle(TextInputStyle.Paragraph).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('b_neden').setLabel('Neden?').setStyle(TextInputStyle.Paragraph).setRequired(true)));
            await interaction.showModal(modal);
        }
        else if (interaction.customId === 'mesai_basla') {
            mesaiTakip.set(interaction.user.id, Date.now());
            await interaction.reply({ content: '🟢 10-41 Başladı.', ephemeral: true });
        }
        else if (interaction.customId === 'mesai_bitir') {
            if (!mesaiTakip.has(interaction.user.id)) return await interaction.reply({ content: '❌ Aktif mesain yok.', ephemeral: true });
            const sure = Math.floor((Date.now() - mesaiTakip.get(interaction.user.id)) / 60000);
            mesaiTakip.delete(interaction.user.id);
            toplamMesailer[interaction.user.id] = (toplamMesailer[interaction.user.id] || 0) + sure;
            veritabaniKaydet();
            await interaction.reply({ content: `✅ 10-42 Bitti. Süre: ${sure} dk.`, ephemeral: true });
        }
    }

    if (interaction.isModalSubmit() && interaction.customId === 'bcso_basvuru_modali') {
        await interaction.reply({ content: '✅ Başvuru iletildi.', ephemeral: true });
        const takipKanali = interaction.guild.channels.cache.find(ch => ch.name.toLowerCase().includes(AYARLAR.BASVURU_TAKIP_KANALI.toLowerCase()));
        if (takipKanali) {
            const embed = new EmbedBuilder().setTitle('Yeni Başvuru').addFields({ name: 'Bilgi', value: interaction.fields.getTextInputValue('b_isim') });
            await takipKanali.send({ embeds: [embed] });
        }
    }
});

client.login(process.env.TOKEN);