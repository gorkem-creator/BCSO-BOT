// --- HATA KORUMA SİSTEMİ (BOTUN ÇÖKMESİNİ ENGELLER) ---
process.on('unhandledRejection', (reason, promise) => { console.log('HATA GÖRÜLDÜ AMA BOT ÇÖKMEDİ:', reason); });
process.on('uncaughtException', (err) => { console.log('KRİTİK HATA:', err); });

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, REST, Routes } = require('discord.js');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates] });

const mesailer = new Map();
const baslangic = new Map();

client.once('ready', async () => {
    const commands = [
        new SlashCommandBuilder().setName('kur-mesai').setDescription('Mesai panelini kurar.'),
        new SlashCommandBuilder().setName('kur-basvuru').setDescription('Başvuru panelini kurar.'),
        new SlashCommandBuilder().setName('mesai').setDescription('Mesai işlemleri')
            .addSubcommand(s => s.setName('kontrol').addUserOption(o => o.setName('kisi').setRequired(true)))
            .addSubcommand(s => s.setName('sıfırla').addUserOption(o => o.setName('kisi').setRequired(true)))
            .addSubcommand(s => s.setName('ekle').addUserOption(o => o.setName('kisi').setRequired(true)).addIntegerOption(o => o.setName('dakika').setRequired(true)))
    ];
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ Bot Tüm Sistemleriyle Hazır!');
});

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === 'kur-mesai') {
                const embed = new EmbedBuilder().setTitle('⚖️ BCSO MESAİ').setDescription('Mesaide değilken botu açık bırakmanız mesainizin sıfırlanması ve strike 1 yemenizle sonuçlanır.').setImage('https://media.discordapp.net/attachments/1498313566015717446/1498797722365460683/image.png').setColor('#2b2d31');
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('giris').setLabel('10-41 (Giriş)').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('cikis').setLabel('10-42 (Çıkış)').setStyle(ButtonStyle.Danger));
                await interaction.reply({ embeds: [embed], components: [row] });
            } else if (interaction.commandName === 'kur-basvuru') {
                const embed = new EmbedBuilder().setTitle('📚 BCSO | BAŞVURU').setDescription('Blaine County Şerif Departmanı bünyesine katılmak için formu doldurabilirsiniz.').setImage('https://media.discordapp.net/attachments/1498313566015717446/1498797722365460683/image.png').setColor('#2b2d31');
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('basvuru_ac').setLabel('Başvuru Yap').setStyle(ButtonStyle.Primary));
                await interaction.reply({ embeds: [embed], components: [row] });
            } else if (interaction.commandName === 'mesai') {
                const sub = interaction.options.getSubcommand();
                const u = interaction.options.getUser('kisi');
                if (sub === 'ekle') { mesailer.set(u.id, (mesailer.get(u.id) || 0) + interaction.options.getInteger('dakika')); await interaction.reply('✅ Eklendi.'); }
                else if (sub === 'sıfırla') { mesailer.set(u.id, 0); await interaction.reply('🧹 Sıfırlandı.'); }
                else { await interaction.reply(`${u.username} toplam mesai: ${mesailer.get(u.id) || 0} dk.`); }
            }
        }
        if (interaction.isButton()) {
            if (interaction.customId === 'giris') { baslangic.set(interaction.user.id, Date.now()); await interaction.reply({ content: '🟢 Giriş yapıldı.', ephemeral: true }); }
            else if (interaction.customId === 'cikis') {
                const start = baslangic.get(interaction.user.id);
                if (!start) return await interaction.reply({ content: '❌ Aktif mesain yok.', ephemeral: true });
                const dk = Math.floor((Date.now() - start) / 60000);
                mesailer.set(interaction.user.id, (mesailer.get(interaction.user.id) || 0) + dk);
                await interaction.reply({ content: `✅ Çıkış yapıldı. Süre: ${dk} dk.`, ephemeral: true });
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
            const kanal = interaction.guild.channels.cache.find(c => c.name === '📚・ʙᴀşᴠᴜʀᴜ-ᴛᴀᴋɪᴘ');
            if (kanal) {
                const embed = new EmbedBuilder().setTitle('Yeni Başvuru').setDescription(`Kullanıcı: ${interaction.user.tag}\n\nİçerik: ${interaction.fields.getTextInputValue('q1')}`);
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('onay').setLabel('Onayla').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('red').setLabel('Reddet').setStyle(ButtonStyle.Danger));
                await kanal.send({ embeds: [embed], components: [row] });
                await interaction.reply({ content: '✅ Başvurunuz iletildi.', ephemeral: true });
            }
        }
    } catch (e) { console.error('Etkileşim Hatası:', e); }
});

client.login(process.env.TOKEN);