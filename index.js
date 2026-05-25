const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { QuickDB } = require('quick.db');
const express = require('express');

// --- WEB SUNUCUSU (Render için gerekli) ---
const app = express();
const port = 3000;
app.get('/', (req, res) => res.send('Bot aktif!'));
app.listen(port, () => console.log(`Web sunucusu ${port} portunda çalışıyor.`));

// --- BOT AYARLARI ---
const db = new QuickDB();
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildVoiceStates, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

client.on('ready', () => console.log(`${client.user.tag} başarıyla giriş yaptı!`));

// --- PANEL KURULUMU (Kanalda !kurulum yazınca çalışır) ---
client.on('messageCreate', async (message) => {
    if (message.content === '!kurulum') {
        const embed = new EmbedBuilder()
            .setTitle("BCSO Mesai ve Başvuru Paneli")
            .setDescription("Mesaide değilken botu açık bırakmanız mesainizin sıfırlanması ve strike 1 yemenizle sonuçlanır.")
            .setImage("https://media.discordapp.net/attachments/1498313566015717446/1498797722365460683/image.png")
            .setColor("Blue");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('giris').setLabel('Mesai Giriş').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('cikis').setLabel('Mesai Çıkış').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('basvuru').setLabel('Başvuru Yap').setStyle(ButtonStyle.Primary)
        );
        message.channel.send({ embeds: [embed], components: [row] });
    }
});

// --- BUTON VE MODAL İŞLEMLERİ ---
client.on('interactionCreate', async (i) => {
    if (i.isButton()) {
        if (i.customId === 'giris') {
            await db.set(`mesai_durum_${i.user.id}`, Date.now());
            await i.reply({ content: "Mesaiye giriş yapıldı!", ephemeral: true });
            const logKanal = i.guild.channels.cache.find(c => c.name === '⏰・ᴍᴇꜱᴀɪ-ʟᴏɢ');
            if (logKanal) logKanal.send(`${i.user.username} mesaiye giriş yaptı: ${new Date().toLocaleTimeString()}`);
        }
        
        if (i.customId === 'cikis') {
            const start = await db.get(`mesai_durum_${i.user.id}`);
            if (!start) return i.reply({ content: "Önce mesaiye giriş yapmalısın!", ephemeral: true });
            
            const duration = Math.floor((Date.now() - start) / 60000); // Dakika hesabı
            await db.add(`toplam_mesai_${i.user.id}`, duration);
            await db.delete(`mesai_durum_${i.user.id}`);
            
            await i.reply({ content: `Çıkış yapıldı! Toplam ${duration} dakika mesai eklendi.`, ephemeral: true });
            const logKanal = i.guild.channels.cache.find(c => c.name === '⏰・ᴍᴇꜱᴀɪ-ʟᴏɢ');
            if (logKanal) logKanal.send(`${i.user.username} mesaiye çıkış yaptı. (Süre: ${duration} dk)`);
        }

        if (i.customId === 'basvuru') {
            const modal = new ModalBuilder().setCustomId('form').setTitle('BCSO Başvuru');
            const input = new TextInputBuilder().setCustomId('q1').setLabel('Başvuru bilgilerinizi buraya yazın:').setStyle(TextInputStyle.Paragraph);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await i.showModal(modal);
        }
    }
});

client.login('MTUwNzg3ODY0NDEzMzkyMDg4OQ.GEEPla.59ZJFNkCVvoS61cUiQ6SjxWpqVHRNcjvvrOpTs');
