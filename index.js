const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
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
    BASVURU_TAKIP_KANALI: '📚・ʙᴀşᴠᴜʀᴜ-ᴛᴀᴋɪᴘ',
    LOGO: 'https://media.discordapp.net/attachments/1438149589667545125/1497790266076299305/Logo_BCSO.png' 
};

client.once('ready', async () => {
    const commands = [
        new SlashCommandBuilder().setName('katıl').setDescription('Telsiz kanalına girer.'),
        new SlashCommandBuilder().setName('ayrıl').setDescription('Telsizden çıkar.'),
        new SlashCommandBuilder().setName('mesai-sistemi-kur').setDescription('Görsel mesai paneli kurar.'),
        new SlashCommandBuilder().setName('başvuru-sistemi-kur').setDescription('Başvuru paneli kurar.'),
        new SlashCommandBuilder().setName('mesai-ekle').setDescription('Mesai ekle.').addUserOption(o => o.setName('kisi').setRequired(true)).addIntegerOption(o => o.setName('dakika').setRequired(true)),
        new SlashCommandBuilder().setName('mesai-sıfırla').setDescription('Mesai sıfırla.').addUserOption(o => o.setName('kisi').setRequired(true)),
        new SlashCommandBuilder().setName('mesai-kontrol').setDescription('Mesai kontrol.').addUserOption(o => o.setName('kisi'))
    ].map(cmd => cmd.toJSON());
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ BCSO | Sistem Aktif!');
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const { commandName, options, member, guild, channel } = interaction;
        await interaction.deferReply({ ephemeral: true });

        if (commandName === 'katıl') {
            if (!member.voice.channel) return await interaction.editReply('❌ Ses kanalında değilsin.');
            try {
                joinVoiceChannel({ channelId: member.voice.channel.id, guildId: guild.id, adapterCreator: guild.voiceAdapterCreator });
                await interaction.editReply('🔊 Telsize bağlanıldı.');
            } catch (e) { await interaction.editReply('❌ Hata oluştu.'); }
        }
        else if (commandName === 'mesai-sistemi-kur') {
            const embed = new EmbedBuilder()
                .setTitle('⚖️ BCSO MESAİ SİSTEMİ')
                .setDescription('Aşağıdaki butonları kullanarak mesai giriş (10-41) ve çıkış (10-42) işlemlerini gerçekleştirebilirsiniz.\n\n**Kurallar:**\n• Görev başında olmadığınız sürece mesai başlatmayın.\n• Suiistimal durumunda mesaileriniz sıfırlanır.')
                .setColor('#2b2d31')
                .setThumbnail(AYARLAR.LOGO)
                .setFooter({ text: 'BCSO Personel Takip Sistemi' });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('mesai_basla').setLabel('Mesai Giriş (10-41)').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('mesai_bitir').setLabel('Mesai Çıkış (10-42)').setStyle(ButtonStyle.Danger)
            );
            await channel.send({ embeds: [embed], components: [row] });
            await interaction.editReply('✅ Görsel panel kuruldu.');
        }
        // ... (Diğer komutlar aynı kalacak)
        else if (commandName === 'mesai-ekle') {
            const u = options.getUser('kisi');
            toplamMesailer[u.id] = (toplamMesailer[u.id] || 0) + options.getInteger('dakika');
            veritabaniKaydet();
            await interaction.editReply(`✅ **${u.username}** adlı kişiye mesai eklendi.`);
        }
        else if (commandName === 'mesai-sıfırla') {
            const u = options.getUser('kisi');
            toplamMesailer[u.id] = 0;
            veritabaniKaydet();
            await interaction.editReply(`🧹 **${u.username}** mesaileri sıfırlandı.`);
        }
        else if (commandName === 'mesai-kontrol') {
            const u = options.getUser('kisi') || interaction.user;
            await interaction.editReply(`📊 **${u.username}** toplam ${toplamMesailer[u.id] || 0} dakika mesai yapmış.`);
        }
    }

    if (interaction.isButton()) {
        if (interaction.customId === 'mesai_basla') { mesaiTakip.set(interaction.user.id, Date.now()); await interaction.reply({ content: '🟢 **10-41** (Mesai) Başladı. İyi görevler!', ephemeral: true }); }
        else if (interaction.customId === 'mesai_bitir') {
            if (!mesaiTakip.has(interaction.user.id)) return await interaction.reply({ content: '❌ Aktif mesain yok.', ephemeral: true });
            const sure = Math.floor((Date.now() - mesaiTakip.get(interaction.user.id)) / 60000);
            mesaiTakip.delete(interaction.user.id);
            toplamMesailer[interaction.user.id] = (toplamMesailer[interaction.user.id] || 0) + sure;
            veritabaniKaydet();
            await interaction.reply({ content: `✅ **10-42** (Mesai) Bitti. Toplam süre: ${sure} dakika.`, ephemeral: true });
        }
    }
});

client.login(process.env.TOKEN);
