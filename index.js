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
        new SlashCommandBuilder().setName('mesai-ekle').setDescription('Mesai ekler.').addUserOption(o => o.setName('kisi').setRequired(true)).addIntegerOption(o => o.setName('dakika').setRequired(true)),
        new SlashCommandBuilder().setName('mesai-sıfırla').setDescription('Mesai sıfırlar.').addUserOption(o => o.setName('kisi').setRequired(true)),
        new SlashCommandBuilder().setName('mesai-kontrol').setDescription('Mesai kontrol eder.').addUserOption(o => o.setName('kisi')),
        new SlashCommandBuilder().setName('mesai-sıralaması').setDescription('Mesai sıralamasını gösterir.')
    ].map(cmd => cmd.toJSON());
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ BCSO | Sistem Hazır!');
});

client.on('interactionCreate', async interaction => {
    // 1. Slash Komutları (deferReply kullanılan yerler)
    if (interaction.isChatInputCommand()) {
        await interaction.deferReply({ ephemeral: true });
        const { commandName, options, member, guild, channel } = interaction;

        if (commandName === 'katıl') {
            if (!member.voice.channel) return interaction.editReply('❌ Ses kanalında değilsin.');
            joinVoiceChannel({ channelId: member.voice.channel.id, guildId: guild.id, adapterCreator: guild.voiceAdapterCreator });
            interaction.editReply('🔊 Telsize bağlanıldı.');
        } 
        else if (commandName === 'ayrıl') {
            const conn = getVoiceConnection(guild.id);
            if (conn) { conn.destroy(); interaction.editReply('🔇 Telsiz bağlantısı kesildi.'); }
            else interaction.editReply('❌ Bot zaten kanalda değil.');
        }
        else if (commandName === 'mesai-sıfırla') {
            const u = options.getUser('kisi');
            toplamMesailer[u.id] = 0;
            veritabaniKaydet();
            interaction.editReply(`🧹 **${u.username}** mesaisi sıfırlandı.`);
        }
        else if (commandName === 'mesai-sistemi-kur') {
            const embed = new EmbedBuilder()
                .setTitle('⚖️ BLAINE COUNTY SHERIFF\'S OFFICE | MESAİ')
                .setThumbnail('https://media.discordapp.net/attachments/1438149589667545125/1497790266076299305/Logo_BCSO.png')
                .setImage('https://media.discordapp.net/attachments/1498313566015717446/1498797722365460683/image.png')
                .setDescription('Giriş/Çıkış yapın.\n\n⚠️ **Rolde değilken mesai açık olma durumlarında mesainiz sıfırlanır ve strike yersiniz!**')
                .setColor('#2b2d31');
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('mesai_basla').setLabel('10-41 (Giriş)').setStyle(ButtonStyle.Success), 
                new ButtonBuilder().setCustomId('mesai_bitir').setLabel('10-42 (Çıkış)').setStyle(ButtonStyle.Danger)
            );
            await channel.send({ embeds: [embed], components: [row] });
            interaction.editReply('✅ Panel kuruldu.');
        }
        else if (commandName === 'başvuru-sistemi-kur') {
            const embed = new EmbedBuilder()
                .setTitle('📚 BCSO | BAŞVURU')
                .setImage('https://media.discordapp.net/attachments/1498313566015717446/1498797722365460683/image.png')
                .setDescription('Blaine County Şerif Departmanı bünyesine katılmak için formu doldurabilirsiniz.')
                .setColor('#2b2d31');
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('basvuru_formu_ac').setLabel('Başvuru Yap').setStyle(ButtonStyle.Primary));
            await channel.send({ embeds: [embed], components: [row] });
            interaction.editReply('✅ Panel kuruldu.');
        }
        else if (commandName === 'mesai-ekle') {
            toplamMesailer[options.getUser('kisi').id] = (toplamMesailer[options.getUser('kisi').id] || 0) + options.getInteger('dakika');
            veritabaniKaydet();
            interaction.editReply('✅ Mesai eklendi.');
        }
        else if (commandName === 'mesai-kontrol') {
            const u = options.getUser('kisi') || interaction.user;
            interaction.editReply(`📊 **${u.username}** toplam ${toplamMesailer[u.id] || 0} dk mesai yapmış.`);
        }
        else if (commandName === 'mesai-sıralaması') {
            const sirali = Object.entries(toplamMesailer).sort((a,b) => b[1]-a[1]).slice(0,10).map((x,i) => `${i+1}. <@${x[0]}>: ${x[1]} dk`).join('\n');
            interaction.editReply(sirali || 'Kayıt yok.');
        }
    }

    // 2. Butonlar (reply kullanılan yerler)
    if (interaction.isButton()) {
        if (interaction.customId === 'mesai_basla') {
            mesaiTakip.set(interaction.user.id, Date.now());
            interaction.reply({ content: '🟢 10-41 (Giriş) Başladı.', ephemeral: true });
        }
        else if (interaction.customId === 'mesai_bitir') {
            if (!mesaiTakip.has(interaction.user.id)) return interaction.reply({ content: '❌ Aktif mesain yok.', ephemeral: true });
            const sure = Math.floor((Date.now() - mesaiTakip.get(interaction.user.id)) / 60000);
            mesaiTakip.delete(interaction.user.id);
            toplamMesailer[interaction.user.id] = (toplamMesailer[interaction.user.id] || 0) + sure;
            veritabaniKaydet();
            interaction.reply({ content: `✅ 10-42 (Çıkış) Yapıldı. Süre: ${sure} dk.`, ephemeral: true });
            const log = interaction.guild.channels.cache.find(c => c.name === LOG_KANALI_ISMI);
            if (log) log.send({ embeds: [new EmbedBuilder().setTitle('📊 MESAİ LOG').addFields({name: 'Personel', value: interaction.user.username}, {name: 'Süre', value: `${sure} dk`}).setColor('Red')] });
        }
        else if (interaction.customId === 'basvuru_formu_ac') {
            const modal = new ModalBuilder().setCustomId('bcso_basvuru_modali').setTitle('BCSO Başvuru').addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q1').setLabel('1- İsim Soyisim / Yaş').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q2').setLabel('2- IC İsim Soyisim / Yaş').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q3').setLabel('3- Aktiflik Süreniz').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q4').setLabel('4- Neden biz ve BCSO?').setStyle(TextInputStyle.Paragraph).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q5').setLabel('5- 5x Strike Onayı (Evet/Hayır)').setStyle(TextInputStyle.Short).setRequired(true))
            );
            await interaction.showModal(modal);
        }
    }
});

client.login(process.env.TOKEN);
