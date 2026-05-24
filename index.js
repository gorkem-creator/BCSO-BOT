const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, REST, Routes } = require('discord.js');
require('dotenv').config();

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildVoiceStates
    ] 
});

client.once('ready', async () => {
    console.log('BCSO Bot Aktif!');
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'kur-mesai') {
        const embed = new EmbedBuilder()
            .setTitle('BCSO MESAİ SİSTEMİ')
            .setDescription('Mesaide değilken botu açık bırakmanız mesainizin sıfırlanması ve strike 1 yemenizle sonuçlanır.')
            .setImage('https://media.discordapp.net/attachments/1498313566015717446/1498797722365460683/image.png')
            .setColor('#2b2d31');
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('giris').setLabel('10-41 (Giriş)').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('cikis').setLabel('10-42 (Çıkış)').setStyle(ButtonStyle.Danger)
        );
        await interaction.reply({ embeds: [embed], components: [row] });
    }
});

client.login(process.env.TOKEN);
