const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const fs = require('fs');
require('dotenv').config();

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

// ===================================================
// 🛠️ PANEL AYARLARI (SADECE MESAİ VE BAŞVURU KANALLARI)
// ===================================================
const AYARLAR = {
    MESA_GIRIS_CIKIS_KANALI: '⏰・ᴍᴇꜱᴀɪ-ɢɪʀɪş-çıᴋış', // Mesai butonlarının kurulacağı kanal
    MESAI_LOG_KANALI: '⏰・ᴍᴇꜱᴀɪ-ʟᴏɢ',               // Giriş/Çıkış kartlarının düşeceği takip kanalı 🟢🔴
    BASVURU_PANEL_KANALI: '📚・ʙᴀşᴠᴜʀᴜ-ꜰᴏʀᴍ',        // "Başvuru Yap" butonunun duracağı kanal
    BASVURU_TAKIP_KANALI: '📚・ʙᴀşᴠᴜʀᴜ-ᴛᴀᴋɪᴘ',       // Başvuruların düşeceği ve ekibin onaylayacağı kanal
    
    DEPARTMAN_LOGOSU: 'https://media.discordapp.net/attachments/1498313566015717446/1498797722365460683/image.png?ex=6a136d27&is=6a121ba7&hm=7ff160607133fc0311fb35e1704625e6335b741d462a45065a9cb29a61d4bbec&=&format=webp&quality=lossless&width=1872&height=761', 
    KUCUK_LOGO: 'https://media.discordapp.net/attachments/1438149589667545125/1497790266076299305/Logo_BCSO.png?ex=6a130ea3&is=6a11bd23&hm=f02ed2512f618d5c165fefa9202afbaaebb83954330ea2a39a82a9a02db27e97&=&format=webp&quality=lossless'        
};

// ===================================================
// 🚀 SLASH KOMUTLARINI OTOMATİK YÜKLEYİCİ
// ===================================================
client.once('ready', async () => {
    const commands = [
        new SlashCommandBuilder().setName('katıl').setDescription('Botun bulunduğunuz telsiz (ses) kanalına gelmesini sağlar.'),
        new SlashCommandBuilder().setName('ayrıl').setDescription('Botun telsiz frekansından çıkmasını sağlar.'),
        new SlashCommandBuilder().setName('sil').setDescription('Kanalda belirtilen miktarda telsiz mesajını temizler.').addIntegerOption(opt => opt.setName('miktar').setDescription('Silinecek mesaj sayısı (1-100)').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
        new SlashCommandBuilder().setName('mesai-sistemi-kur').setDescription('10-41 / 10-42 Butonlu mesai panelini kanala kurar.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        new SlashCommandBuilder().setName('başvuru-sistemi-kur').setDescription('Akıllı memur başvuru panelini ilgili kanala kurar.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        new SlashCommandBuilder().setName('mesai-sıralaması').setDescription('En çok mesai yapan ilk 20 şerif personellerini listeler.'),
        new SlashCommandBuilder().setName('ban').setDescription('Birini sunucudan uçurur.').addUserOption(opt => opt.setName('kullanıcı').setDescription('Banlanacak kişi').setRequired(true)).addStringOption(opt => opt.setName('sebep').setDescription('Banlanma sebebi')).setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
        new SlashCommandBuilder().setName('kick').setDescription('Bir üyeyi sunucudan atar.').addUserOption(opt => opt.setName('kullanıcı').setDescription('Atılacak kişi').setRequired(true)).addStringOption(opt => opt.setName('sebep').setDescription('Atılma sebebi')).setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
        new SlashCommandBuilder().setName('rol-ver').setDescription('Belirtilen personele rütbe/rol tanımlar.').addUserOption(opt => opt.setName('kullanıcı').setDescription('Rol verilecek personel').setRequired(true)).addRoleOption(opt => opt.setName('rol').setDescription('Verilecek rol/rütbe').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
        new SlashCommandBuilder().setName('rol-al').setDescription('Belirtilen personelden rütbe/rolü geri alır.').addUserOption(opt => opt.setName('kullanıcı').setDescription('Rolü alınacak personel').setRequired(true)).addRoleOption(opt => opt.setName('rol').setDescription('Alınacak rol/rütbe').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ TÜM ENTEGRE KOMUTLAR BAŞARIYLA YÜKLENDİ!');
    } catch (error) { console.error(error); }
    console.log(`⭐ BCSO | Sistem Tamamen Aktif!`);
});

// ===================================================
// ⚡ INTERACTION (KOMUT, BUTON VE MODAL) MOTORU
// ===================================================
client.on('interactionCreate', async interaction => {
    
    // --- SLASH KOMUTLARI ---
    if (interaction.isChatInputCommand()) {
        const { commandName, options, guild, channel, member } = interaction;

        if (['mesai-sistemi-kur', 'başvuru-sistemi-kur', 'mesai-sıralaması', 'ban', 'kick', 'rol-ver', 'rol-al'].includes(commandName)) {
            await interaction.deferReply({ ephemeral: commandName.includes('kur') });
        } else { await interaction.deferReply(); }

        if (commandName === 'başvuru-sistemi-kur') {
            if (!channel.name.toLowerCase().includes(AYARLAR.BASVURU_PANEL_KANALI.toLowerCase())) {
                return await interaction.editReply({ content: `❌ Bu paneli sadece adında \`${AYARLAR.BASVURU_PANEL_KANALI}\` geçen kanalda kurabilirsiniz!` });
            }

            const basvuruEmbed = new EmbedBuilder()
                .setColor('#DDB892')
                .setTitle('🤠 BLAINE COUNTY SHERIFF\'S OFFICE | BAŞVURU PANELİ 🤠')
                .setDescription(`Blaine County Şerif Departmanı bünyesine katılmak ve şerif yardımcısı rütbesiyle devriyeye çıkmak için aşağıdaki butondan formu doldurabilirsiniz.`)
                .setImage(AYARLAR.DEPARTMAN_LOGOSU);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('basvuru_formu_ac').setLabel('🤠 Başvuru Formunu Doldur').setStyle(ButtonStyle.Primary)
            );

            await channel.send({ embeds: [basvuruEmbed], components: [row] });
            await interaction.editReply({ content: '✅ Başvuru Paneli kuruldu!' });
        }

        if (commandName === 'katıl') {
            const voiceChannel = member.voice.channel;
            if (!voiceChannel) return await interaction.editReply('❌ Önce bir ses kanalında olmalısınız!');
            try { joinVoiceChannel({ channelId: voiceChannel.id, guildId: guild.id, adapterCreator: guild.voiceAdapterCreator, selfMute: false, selfDeaf: true }); await interaction.editReply(`🔊 **${voiceChannel.name}** telsizine bağlanıldı.`); } catch { await interaction.editReply('❌ Bağlanılamadı.'); }
        }
        if (commandName === 'ayrıl') { const connection = getVoiceConnection(guild.id); if (!connection) return await interaction.editReply('❌ Bot telsizde değil.'); connection.destroy(); await interaction.editReply('📴 Telsizden çıkıldı.'); }
        if (commandName === 'sil') { const miktar = options.getInteger('miktar'); const deleted = await channel.bulkDelete(miktar, true); await interaction.editReply(`🧹 **${deleted.size}** mesaj temizlendi.`); }
        if (commandName === 'ban') { const u = options.getUser('kullanıcı'); const s = options.getString('sebep') || 'Yok'; const m = guild.members.cache.get(u.id); if(!m||!m.bannable) return await interaction.editReply('Hata'); await m.ban({reason:s}); await interaction.editReply(`🔨 ${u.username} banlandı.`); }
        if (commandName === 'kick') { const u = options.getUser('kullanıcı'); const s = options.getString('sebep') || 'Yok'; const m = guild.members.cache.get(u.id); if(!m||!m.kickable) return await interaction.editReply('Hata'); await m.kick(s); await interaction.editReply(`🥾 ${u.username} atıldı.`); }
        if (commandName === 'rol-ver') { const m = guild.members.cache.get(options.getUser('kullanıcı').id); const r = options.getRole('rol'); await m.roles.add(r); await interaction.editReply(`✅ Rol verildi.`); }
        if (commandName === 'rol-al') { const m = guild.members.cache.get(options.getUser('kullanıcı').id); const r = options.getRole('rol'); await m.roles.remove(r); await interaction.editReply(`❌ Rol alındı.`); }
        
        if (commandName === 'mesai-sıralaması') {
            const siraliListe = Object.entries(toplamMesailer).sort((a, b) => b[1] - a[1]).slice(0, 20);
            if (siraliListe.length === 0) return await interaction.editReply('📭 Kayıt bulunamadı.');
            let siraMetni = ""; const madalyalar = ["🥇", "🥈", "🥉"];
            siraliListe.forEach(([userId, toplamDakika], index) => { const saat = Math.floor(toplamDakika / 60); const dakika = Math.floor(toplamDakika % 60); const sureYazisi = saat > 0 ? `\`${saat} Saat ${dakika} Dakika\`` : `\`${dakika} Dakika\``; const simge = madalyalar[index] || `🔹 **${index + 1}.**`; siraMetni += `${simge} <@${userId}> | Toplam: ${sureYazisi}\n`; });
            const siraEmbed = new EmbedBuilder().setColor('#DDB892').setTitle('🤠 BCSO | LİDERLİK TABLOSU 🤠').setDescription(siraMetni).setThumbnail(AYARLAR.KUCUK_LOGO).setTimestamp();
            await interaction.editReply({ embeds: [siraEmbed] });
        }

        if (commandName === 'mesai-sistemi-kur') {
            if (!channel.name.toLowerCase().includes(AYARLAR.MESA_GIRIS_CIKIS_KANALI.toLowerCase())) return await interaction.editReply(`❌ Hatalı kanal.`);
            const panelEmbed = new EmbedBuilder().setColor('#DDB892').setTitle('🤠 BCSO - MESAİ PANELİ 🤠').setDescription(`Blaine County sınırları içerisinde göreve başlarken (10-41) ve görevi bitirirken (10-42) aşağıdaki butonları kullanmak zorundasınız.`).setImage(AYARLAR.DEPARTMAN_LOGOSU).setTimestamp();
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('mesai_basla').setLabel('Mesai Giriş (10-41)').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('mesai_bitir').setLabel('Mesai Çıkış (10-42)').setStyle(ButtonStyle.Danger));
            await channel.send({ embeds: [panelEmbed], components: [row] }); await interaction.editReply('✅ Mesai paneli kuruldu!');
        }
    }

    // --- BUTON MOTORU ---
    if (interaction.isButton()) {
        const { customId, user, guild, message } = interaction;

        if (customId === 'basvuru_formu_ac') {
            const modal = new ModalBuilder().setCustomId('bcso_basvuru_modali').setTitle('BCSO Memur Başvuru Formu');
            const q1 = new TextInputBuilder().setCustomId('b_isim').setLabel('İsim / Nickname ve Yaşınız?').setStyle(TextInputStyle.Short).setRequired(true);
            const q2 = new TextInputBuilder().setCustomId('b_aktiflik').setLabel('Haftada kaç saat aktif olabilirsiniz?').setStyle(TextInputStyle.Short).setRequired(true);
            const q3 = new TextInputBuilder().setCustomId('b_tecrube').setLabel('Daha önce hiç emniyet rolü yaptınız mı?').setStyle(TextInputStyle.Paragraph).setRequired(true);
            const q4 = new TextInputBuilder().setCustomId('b_neden').setLabel('Neden Şerif Departmanı ve neden siz?').setStyle(TextInputStyle.Paragraph).setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(q1), new ActionRowBuilder().addComponents(q2), new ActionRowBuilder().addComponents(q3), new ActionRowBuilder().addComponents(q4));
            return await interaction.showModal(modal);
        }

        if (customId === 'basvuru_onayla') {
            await interaction.deferReply({ ephemeral: true });
            const onayEmbed = EmbedBuilder.from(message.embeds[0]).setColor('#2B9348').setTitle('✅ BAŞVURU KABUL EDİLDİ').setFooter({ text: `Onaylayan Yetkili: ${user.username}` });
            await message.edit({ embeds: [onayEmbed], components: [] });
            await interaction.editReply({ content: '✅ Başvuru KABUL edildi.' });
        }

        if (customId === 'basvuru_reddet') {
            await interaction.deferReply({ ephemeral: true });
            const redEmbed = EmbedBuilder.from(message.embeds[0]).setColor('#E63946').setTitle('❌ BAŞVURU REDDEDİLDİ').setFooter({ text: `Reddeden Yetkili: ${user.username}` });
            await message.edit({ embeds: [redEmbed], components: [] });
            await interaction.editReply({ content: '❌ Başvuru REDDEDİLDİ.' });
        }

        // 🤠 MESAİ LOG MEKANİZMASI (GERİ EKLENDİ)
        const simdi = new Date(); 
        const zamanFormati = simdi.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        const mLogKanal = guild.channels.cache.find(ch => ch.name.toLowerCase().includes(AYARLAR.MESAI_LOG_KANALI.toLowerCase()));

        if (customId === 'mesai_basla') {
            if (mesaiTakip.has(user.id)) return await interaction.reply({ content: '❌ Zaten aktif mesainiz var!', ephemeral: true });
            mesaiTakip.set(user.id, simdi.getTime());
            
            // Kanala giden yeşil log embedi
            if (mLogKanal) {
                const logGirisEmbed = new EmbedBuilder().setColor('#2B9348').setTitle('🟢 [10-41] DEVRİYE BAŞLANGICI').setThumbnail(user.displayAvatarURL({ dynamic: true })).addFields({ name: '🤠 Personel', value: `${user}`, inline: true }, { name: '⏰ Giriş Saati', value: `\`${zamanFormati}\``, inline: true }).setTimestamp();
                await mLogKanal.send({ embeds: [logGirisEmbed] });
            }
            await interaction.reply({ content: `🟢 **10-41 Göreve başlandı.** Saat: \`${zamanFormati}\``, ephemeral: true });
        }
        
        if (customId === 'mesai_bitir') {
            if (!mesaiTakip.has(user.id)) return await interaction.reply({ content: '❌ Aktif mesainiz yok!', ephemeral: true });
            const g = mesaiTakip.get(user.id); 
            mesaiTakip.delete(user.id); 
            const f = simdi.getTime() - g; 
            const t = f / 1000 / 60;
            
            if (!toplamMesailer[user.id]) toplamMesailer[user.id] = 0; 
            toplamMesailer[user.id] += t; 
            veritabaniKaydet();
            
            const saat = Math.floor(t / 60); 
            const dakika = Math.floor(t % 60); 
            let sY = saat > 0 ? `${saat} Saat ${dakika} Dakika` : `${dakika} Dakika`;
            
            // Kanala giden kırmızı log embedi
            if (mLogKanal) {
                const logCikisEmbed = new EmbedBuilder().setColor('#E63946').setTitle('🔴 [10-42] DEVRİYE BİTİŞİ').setThumbnail(user.displayAvatarURL({ dynamic: true })).addFields({ name: '🤠 Personel', value: `${user}`, inline: true }, { name: '⏱️ Bu Devriye', value: `\`${sY}\``, inline: true }).setTimestamp();
                await mLogKanal.send({ embeds: [logCikisEmbed] });
            }
            await interaction.reply({ content: `🔴 **10-42 Mesai bitirildi.** Bu devriye süreniz: \`${sY}\``, ephemeral: true });
        }
    }

    // --- FORM GÖNDERİLİNCE TETİKLENEN KISIM ---
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'bcso_basvuru_modali') {
            await interaction.reply({ content: '✅ Başvurunuz başarıyla alındı yetkililer inceleyecektir.', ephemeral: true });

            const isim = interaction.fields.getTextInputValue('b_isim');
            const aktiflik = interaction.fields.getTextInputValue('b_aktiflik');
            const tecrube = interaction.fields.getTextInputValue('b_tecrube');
            const neden = interaction.fields.getTextInputValue('b_neden');

            const takipKanali = interaction.guild.channels.cache.find(ch => ch.name.toLowerCase().includes(AYARLAR.BASVURU_TAKIP_KANALI.toLowerCase()));
            if (!takipKanali) return;

            const formEmbed = new EmbedBuilder()
                .setColor('#F4A261')
                .setTitle('📯 YENİ BAŞVURU GELDİ!')
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .setDescription(`**Başvuru Sahibi:** ${interaction.user}`)
                .addFields(
                    { name: '📝 İsim ve Yaş:', value: `\`\`\`${isim}\`\`\`` },
                    { name: '⏰ Aktiflik Süresi:', value: `\`\`\`${aktiflik}\`\`\`` },
                    { name: '🛡️ Tecrübe:', value: `\`\`\`${tecrube}\`\`\`` },
                    { name: '🤠 Neden Biz?:', value: `\`\`\`${neden}\`\`\`` }
                );

            const yonetimRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('basvuru_onayla').setLabel('Onayla').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('basvuru_reddet').setLabel('Reddet').setStyle(ButtonStyle.Danger)
            );

            await takipKanali.send({ embeds: [formEmbed], components: [yonetimRow] });
        }
    }
});

client.login(process.env.TOKEN);