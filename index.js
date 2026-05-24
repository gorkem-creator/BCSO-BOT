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
        new SlashCommandBuilder().setName('katıl').setDescription('Telsiz kanalına girer.'),
        new SlashCommandBuilder().setName('ayrıl').setDescription('Telsizden çıkar.'),
        new SlashCommandBuilder().setName('mesai-sistemi-kur').setDescription('Görsel mesai paneli kurar.'),
        new SlashCommandBuilder().setName('başvuru-sistemi-kur').setDescription('Başvuru paneli kurar.'),
        new SlashCommandBuilder().setName('mesai-ekle').setDescription('Mesai ekle.').addUserOption(o => o.setName('kisi').setRequired(true)).addIntegerOption(o => o.setName('dakika').setRequired(true)),
        new SlashCommandBuilder().setName('mesai-sıfırla').setDescription('Mesai sıfırla.').addUserOption(o => o.setName('kisi').setRequired(true)),
        new SlashCommandBuilder().setName('mesai-kontrol').setDescription('Mesai kontrol.').addUserOption(o => o.setName('kisi')),
        new SlashCommandBuilder().setName('mesai-sıralaması').setDescription('Mesai sıralamasını gösterir.')
    ].map(cmd => cmd.toJSON());
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ BCSO | Sistem Başarıyla Aktif Edildi!');
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
                .setColor('#2b2d31');
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('basvuru_formu_ac').setLabel('Başvuru Yap').setStyle(ButtonStyle.Primary));
            await channel.send({ embeds: [embed], components: [row] });
            await interaction.editReply('✅ Panel kuruldu.');
        }
        // ... (Diğer komutlar aynı)
    }

    if (interaction.isButton()) {
        if (interaction.customId === 'mesai_basla') { mesaiTakip.set(interaction.user.id, Date.now()); await interaction.reply({ content: '🟢 10-41 (Giriş) Başladı.', ephemeral: true }); }
        else if (interaction.customId === 'mesai_bitir') {
            if (!mesaiTakip.has(interaction.user.id)) return await interaction.reply({ content: '❌ Aktif mesain yok.', ephemeral: true });
            const sure = Math.floor((Date.now() - mesaiTakip.get(interaction.user.id)) / 60000);
            mesaiTakip.delete(interaction.user.id);
            toplamMesailer[interaction.user.id] = (toplamMesailer[interaction.user.id] || 0) + sure;
            veritabaniKaydet();
            await interaction.reply({ content: `✅ 10-42 (Çıkış) Yapıldı. Süre: ${sure} dk.`, ephemeral: true });
            
            // LOG SİSTEMİ DÜZELTME
            const log = interaction.guild.channels.cache.find(c => c.name === LOG_KANALI_ISMI);
            if (log) {
                const logEmbed = new EmbedBuilder().setTitle('📊 MESAİ LOG').addFields({name: 'Personel', value: interaction.user.username}, {name: 'Süre', value: `${sure} dk`}).setColor('Red');
                log.send({ embeds: [logEmbed] });
            }
        }
    }
});

client.login(process.env.TOKEN);
