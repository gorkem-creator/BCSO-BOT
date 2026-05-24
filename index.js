const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, REST, Routes } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Veritabanı yerine basit bir harita (Basitlik için)
const mesailer = new Map(); // {userId: totalMinutes}
const aktifMesailer = new Map(); // {userId: startTime}

client.on('ready', async () => {
    const commands = [
        new SlashCommandBuilder().setName('katıl').setDescription('Ses kanalına katılır.'),
        new SlashCommandBuilder().setName('ayrıl').setDescription('Ses kanalından ayrılır.'),
        new SlashCommandBuilder().setName('kur').setDescription('Panelleri kurar.').addStringOption(o => o.setName('tip').setDescription('mesai veya basvuru').setRequired(true)),
        new SlashCommandBuilder().setName('mesai').setDescription('Mesai işlemleri').addSubcommand(s => s.setName('ekle').addUserOption(o => o.setName('kisi').setRequired(true)).addIntegerOption(o => o.setName('dakika').setRequired(true))).addSubcommand(s => s.setName('sıfırla').addUserOption(o => o.setName('kisi').setRequired(true))).addSubcommand(s => s.setName('kontrol').addUserOption(o => o.setName('kisi').setRequired(true)))
    ];
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ BCSO Bot Aktif!');
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'katıl') {
            if (!interaction.member.voice.channel) return interaction.reply({ content: 'Ses kanalında değilsin!', ephemeral: true });
            joinVoiceChannel({ channelId: interaction.member.voice.channel.id, guildId: interaction.guild.id, adapterCreator: interaction.guild.voiceAdapterCreator });
            interaction.reply('🔊 Bağlanıldı.');
        } else if (interaction.commandName === 'ayrıl') {
            getVoiceConnection(interaction.guild.id)?.destroy();
            interaction.reply('🔇 Ayrılındı.');
        } else if (interaction.commandName === 'kur') {
            const tip = interaction.options.getString('tip');
            if (tip === 'mesai') {
                const embed = new EmbedBuilder().setTitle('BCSO MESAİ').setImage('https://media.discordapp.net/attachments/1498313566015717446/1498797722365460683/image.png').setDescription('Mesaide değilken botu açık bırakmanız mesainizin sıfırlanması ve strike 1 yemenizle sonuçlanır.').setColor('#2b2d31');
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('giriş').setLabel('10-41 (Giriş)').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('çıkış').setLabel('10-42 (Çıkış)').setStyle(ButtonStyle.Danger));
                await interaction.channel.send({ embeds: [embed], components: [row] });
            } else {
                const embed = new EmbedBuilder().setTitle('BCSO BAŞVURU').setImage('https://media.discordapp.net/attachments/1498313566015717446/1498797722365460683/image.png').setDescription('Blaine County Şerif Departmanı bünyesine katılmak için formu doldurabilirsiniz.').setColor('#2b2d31');
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('başvuru_aç').setLabel('Başvuru Yap').setStyle(ButtonStyle.Primary));
                await interaction.channel.send({ embeds: [embed], components: [row] });
            }
            interaction.reply({ content: '✅ Kuruldu.', ephemeral: true });
        } else if (interaction.commandName === 'mesai') {
            const sub = interaction.options.getSubcommand();
            const u = interaction.options.getUser('kisi');
            if (sub === 'ekle') { mesailer.set(u.id, (mesailer.get(u.id) || 0) + interaction.options.getInteger('dakika')); interaction.reply('✅ Eklendi.'); }
            else if (sub === 'sıfırla') { mesailer.set(u.id, 0); interaction.reply('🧹 Sıfırlandı.'); }
            else { interaction.reply(`${u.username} toplam: ${mesailer.get(u.id) || 0} dk.`); }
        }
    }

    if (interaction.isButton()) {
        if (interaction.customId === 'giriş') { aktifMesailer.set(interaction.user.id, new Date()); interaction.reply({ content: '🟢 Giriş yapıldı.', ephemeral: true }); }
        else if (interaction.customId === 'çıkış') {
            const start = aktifMesailer.get(interaction.user.id);
            if (!start) return interaction.reply({ content: '❌ Aktif mesain yok.', ephemeral: true });
            const dk = Math.floor((new Date() - start) / 60000);
            mesailer.set(interaction.user.id, (mesailer.get(interaction.user.id) || 0) + dk);
            interaction.reply({ content: `✅ Çıkış yapıldı. Süre: ${dk} dk.`, ephemeral: true });
            const log = interaction.guild.channels.cache.find(c => c.name === '⏰・ᴍᴇꜱᴀɪ-ʟᴏɢ');
            log?.send(`👤 ${interaction.user.username} - Süre: ${dk} dk - Saat: ${new Date().toLocaleTimeString()}`);
        } else if (interaction.customId === 'başvuru_aç') {
            const modal = new ModalBuilder().setCustomId('modal_basvuru').setTitle('BCSO Başvuru').addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q1').setLabel('OOC İsim / Yaş').setStyle(TextInputStyle.Short)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q2').setLabel('İC İsim / Yaş').setStyle(TextInputStyle.Short)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q3').setLabel('Aktiflik Süreniz').setStyle(TextInputStyle.Short)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q4').setLabel('Neden BCSO?').setStyle(TextInputStyle.Paragraph)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q5').setLabel('Polislik Bilginiz 10/?').setStyle(TextInputStyle.Short))
            );
            await interaction.showModal(modal);
        }
    }

    if (interaction.isModalSubmit()) {
        const log = interaction.guild.channels.cache.find(c => c.name === '📚・ʙᴀşᴠᴜʀᴜ-ᴛᴀᴋɪᴘ');
        const embed = new EmbedBuilder().setTitle('Yeni Başvuru').addFields({ name: 'Kişi', value: interaction.user.tag }, { name: 'İçerik', value: '...' });
        log?.send({ embeds: [embed] });
        interaction.reply({ content: '✅ Başvurunuz iletildi.', ephemeral: true });
    }
});

client.login(process.env.TOKEN);
