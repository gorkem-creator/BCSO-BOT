const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const fs = require('fs');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMembers] });

const mesaiTakip = new Map();
const VERITABANI_DOSYASI = './mesaiSüreleri.json';
const LOG_KANALI_ISMI = '⏰・ᴍᴇꜱᴀɪ-ʟᴏɢ'; 

let toplamMesailer = {};
if (fs.existsSync(VERITABANI_DOSYASI)) {
    try { toplamMesailer = JSON.parse(fs.readFileSync(VERITABANI_DOSYASI, 'utf8')); } catch (e) { toplamMesailer = {}; }
}
function veritabaniKaydet() { fs.writeFileSync(VERITABANI_DOSYASI, JSON.stringify(toplamMesailer, null, 4), 'utf8'); }

client.once('ready', async () => {
    const commands = [
        new SlashCommandBuilder().setName('katıl').setDescription('Botu ses kanalına çağırır.'),
        new SlashCommandBuilder().setName('ayrıl').setDescription('Botu ses kanalından çıkarır.'),
        new SlashCommandBuilder().setName('mesai-sistemi-kur').setDescription('Görsel mesai paneli kurar.'),
        new SlashCommandBuilder().setName('başvuru-sistemi-kur').setDescription('Başvuru paneli kurar.'),
        new SlashCommandBuilder().setName('mesai-ekle').setDescription('Mesai ekler.').addUserOption(o => o.setName('kisi').setDescription('Kişi').setRequired(true)).addIntegerOption(o => o.setName('dakika').setDescription('Dakika').setRequired(true)),
        new SlashCommandBuilder().setName('mesai-sıfırla').setDescription('Mesai sıfırlar.').addUserOption(o => o.setName('kisi').setDescription('Kişi').setRequired(true)),
        new SlashCommandBuilder().setName('mesai-kontrol').setDescription('Mesai kontrol eder.').addUserOption(o => o.setName('kisi').setDescription('Kişi')),
        new SlashCommandBuilder().setName('mesai-sıralaması').setDescription('Mesai sıralamasını gösterir.')
    ].map(cmd => cmd.toJSON());
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ BCSO | Sistem Hazır!');
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const { commandName, options, member, guild, channel } = interaction;
        await interaction.deferReply({ ephemeral: true });

        if (commandName === 'katıl') {
            if (!member.voice.channel) return await interaction.editReply('❌ Ses kanalında değilsin.');
            joinVoiceChannel({ channelId: member.voice.channel.id, guildId: guild.id, adapterCreator: guild.voiceAdapterCreator });
            await interaction.editReply('🔊 Telsize bağlanıldı.');
        } 
        else if (commandName === 'ayrıl') {
            const conn = getVoiceConnection(guild.id);
            if (conn) { conn.destroy(); await interaction.editReply('🔇 Telsiz bağlantısı kesildi.'); }
            else await interaction.editReply('❌ Bot zaten kanalda değil.');
        }
        else if (commandName === 'mesai-sistemi-kur') {
            const embed = new EmbedBuilder()
                .setTitle('⚖️ BLAINE COUNTY SHERIFF\'S OFFICE | MESAİ')
                .setThumbnail('https://media.discordapp.net/attachments/1438149589667545125/1497790266076299305/Logo_BCSO.png')
                .setImage('https://media.discordapp.net/attachments/1498313566015717446/1498797722365460683/image.png')
                .setDescription('Giriş/Çıkış yapın.\n\n⚠️ **Rolde değilken mesai açık olma durumlarında mesainiz sıfırlanır ve strike yersiniz!**')
                .setColor('#2b2d31');
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('mesai_basla').setLabel('10-41 (Giriş)').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('mesai_bitir').setLabel('10-42 (Çıkış)').setStyle(ButtonStyle.Danger));
            await channel.send({ embeds: [embed], components: [row] });
            await interaction.editReply('✅ Panel kuruldu.');
        }
        else if (commandName === 'başvuru-sistemi-kur') {
            const embed = new EmbedBuilder()
                .setTitle('📚 BLAINE COUNTY SHERIFF\'S OFFICE | BAŞVURU')
                .setImage('https://media.discordapp.net/attachments/1498313566015717446/1498797722365460683/image.png')
                .setDescription('Blaine County Şerif Departmanı bünyesine katılmak ve şerif yardımcısı rütbesiyle devriyeye çıkmak için aşağıdaki butondan formu doldurabilirsiniz.')
                .setColor('#2b2d31');
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('basvuru_formu_ac').setLabel('Başvuru Yap').setStyle(ButtonStyle.Primary));
            await channel.send({ embeds: [embed], components: [row] });
            await interaction.editReply('✅ Panel kuruldu.');
        }
        // ... (Diğer komutlar)
    }

    if (interaction.isButton()) {
        if (interaction.customId === 'basvuru_formu_ac') {
            const modal = new ModalBuilder().setCustomId('bcso_basvuru_modali').setTitle('BCSO Başvuru Formu')
                .addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q1').setLabel('1- İsim Soyisim / Yaş').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q2').setLabel('2- IC İsim Soyisim / Yaş').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q3').setLabel('3- Aktiflik Süreniz').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q4').setLabel('4- Neden biz ve BCSO?').setStyle(TextInputStyle.Paragraph).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q5').setLabel('5- 5x Strike Onayı (Evet/Hayır)').setStyle(TextInputStyle.Short).setRequired(true))
                );
            await interaction.showModal(modal);
        }
        // ... (Diğer butonlar)
    }
});

client.login(process.env.TOKEN);
