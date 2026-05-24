const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, REST, Routes } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates] });

const mesailer = new Map();
const baslangicZamani = new Map();

client.once('ready', async () => {
    const commands = [
        new SlashCommandBuilder().setName('katıl').setDescription('Botu ses kanalına çağırır.'),
        new SlashCommandBuilder().setName('ayrıl').setDescription('Botu kanaldan çıkarır.'),
        new SlashCommandBuilder().setName('mesai-panel-kur').setDescription('Mesai panelini kurar.'),
        new SlashCommandBuilder().setName('başvuru-panel-kur').setDescription('Başvuru panelini kurar.'),
        new SlashCommandBuilder().setName('mesai').setDescription('Mesai işlemleri')
            .addSubcommand(s => s.setName('kontrol').addUserOption(o => o.setName('kisi').setRequired(true)))
            .addSubcommand(s => s.setName('sıfırla').addUserOption(o => o.setName('kisi').setRequired(true)))
            .addSubcommand(s => s.setName('ekle').addUserOption(o => o.setName('kisi').setRequired(true)).addIntegerOption(o => o.setName('dakika').setRequired(true)))
    ];
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ Bot çalışıyor!');
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'katıl') {
            joinVoiceChannel({ channelId: interaction.member.voice.channel.id, guildId: interaction.guild.id, adapterCreator: interaction.guild.voiceAdapterCreator });
            interaction.reply({ content: '🔊 Telsize bağlanıldı.', ephemeral: true });
        } else if (interaction.commandName === 'ayrıl') {
            getVoiceConnection(interaction.guild.id)?.destroy();
            interaction.reply({ content: '🔇 Telsizden ayrılındı.', ephemeral: true });
        } else if (interaction.commandName === 'mesai-panel-kur') {
            const embed = new EmbedBuilder().setTitle('BCSO MESAİ').setImage('https://media.discordapp.net/attachments/1498313566015717446/1498797722365460683/image.png').setDescription('Mesaide değilken botu açık bırakmanız mesainizin sıfırlanması ve strike 1 yemenizle sonuçlanır.').setColor('#2b2d31');
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('giris').setLabel('10-41 (Giriş)').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('cikis').setLabel('10-42 (Çıkış)').setStyle(ButtonStyle.Danger));
            await interaction.channel.send({ embeds: [embed], components: [row] });
            interaction.reply({ content: '✅ Mesai paneli kuruldu.', ephemeral: true });
        } else if (interaction.commandName === 'başvuru-panel-kur') {
            const embed = new EmbedBuilder().setTitle('BCSO BAŞVURU').setImage('https://media.discordapp.net/attachments/1498313566015717446/1498797722365460683/image.png').setDescription('Blaine County Şerif Departmanı bünyesine katılmak için formu doldurabilirsiniz.').setColor('#2b2d31');
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('basvuru_ac').setLabel('Başvuru Yap').setStyle(ButtonStyle.Primary));
            await interaction.channel.send({ embeds: [embed], components: [row] });
            interaction.reply({ content: '✅ Başvuru paneli kuruldu.', ephemeral: true });
        } else if (interaction.commandName === 'mesai') {
            const sub = interaction.options.getSubcommand();
            const u = interaction.options.getUser('kisi');
            if (sub === 'ekle') { mesailer.set(u.id, (mesailer.get(u.id) || 0) + interaction.options.getInteger('dakika')); interaction.reply('✅ Eklendi.'); }
            else if (sub === 'sıfırla') { mesailer.set(u.id, 0); interaction.reply('🧹 Sıfırlandı.'); }
            else { interaction.reply(`${u.username} toplam mesai: ${mesailer.get(u.id) || 0} dk.`); }
        }
    }
    
    if (interaction.isButton()) {
        if (interaction.customId === 'giris') { baslangicZamani.set(interaction.user.id, Date.now()); interaction.reply({ content: '🟢 Giriş yapıldı.', ephemeral: true }); }
        else if (interaction.customId === 'cikis') {
            const start = baslangicZamani.get(interaction.user.id);
            const dk = Math.floor((Date.now() - start) / 60000);
            mesailer.set(interaction.user.id, (mesailer.get(interaction.user.id) || 0) + dk);
            interaction.reply({ content: `✅ Çıkış yapıldı. Süre: ${dk} dk.`, ephemeral: true });
            interaction.guild.channels.cache.find(c => c.name === '⏰・ᴍᴇꜱᴀɪ-ʟᴏɢ')?.send(`👤 ${interaction.user.username} çıktı. Süre: ${dk} dk.`);
        } else if (interaction.customId === 'basvuru_ac') {
            const modal = new ModalBuilder().setCustomId('modal').setTitle('BCSO Başvuru').addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q1').setLabel('OOC İsim/Yaş').setStyle(TextInputStyle.Short)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q2').setLabel('İC İsim/Yaş').setStyle(TextInputStyle.Short)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q3').setLabel('Aktiflik').setStyle(TextInputStyle.Short)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q4').setLabel('Neden BCSO?').setStyle(TextInputStyle.Paragraph)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q5').setLabel('Polislik 10/?').setStyle(TextInputStyle.Short))
            );
            await interaction.showModal(modal);
        }
    }

    if (interaction.isModalSubmit()) {
        interaction.guild.channels.cache.find(c => c.name === '📚・ʙᴀşᴠᴜʀᴜ-ᴛᴀᴋɪᴘ')?.send(`Yeni Başvuru: ${interaction.user.tag}\nİçerik: ${interaction.fields.getTextInputValue('q1')}`);
        interaction.reply({ content: '✅ Başvurunuz iletildi.', ephemeral: true });
    }
});

client.login(process.env.TOKEN);
