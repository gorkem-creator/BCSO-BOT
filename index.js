const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const http = require('http');
require('dotenv').config();

http.createServer((req, res) => res.end("Bot Aktif!")).listen(process.env.PORT || 3000);

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMembers] });

let toplamMesailer = JSON.parse(fs.readFileSync('./mesaiSüreleri.json', 'utf8') || '{}');
function veritabaniKaydet() { fs.writeFileSync('./mesaiSüreleri.json', JSON.stringify(toplamMesailer, null, 4)); }

client.once('ready', async () => {
    const commands = [
        new SlashCommandBuilder().setName('mesai-ekle').setDescription('Mesai ekle').addUserOption(o => o.setName('kisi').setRequired(true)).addIntegerOption(o => o.setName('dakika').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        new SlashCommandBuilder().setName('mesai-sıfırla').setDescription('Mesai sıfırla').addUserOption(o => o.setName('kisi').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        new SlashCommandBuilder().setName('mesai-kontrol').setDescription('Mesai kontrol').addUserOption(o => o.setName('kisi')),
    ];
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ Komutlar yüklendi!');
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    await interaction.deferReply({ ephemeral: true });

    const u = interaction.options.getUser('kisi');
    if (interaction.commandName === 'mesai-ekle') {
        toplamMesailer[u.id] = (toplamMesailer[u.id] || 0) + interaction.options.getInteger('dakika');
        veritabaniKaydet();
        await interaction.editReply(`✅ ${u.username} kişisine eklendi.`);
    } else if (interaction.commandName === 'mesai-sıfırla') {
        toplamMesailer[u.id] = 0;
        veritabaniKaydet();
        await interaction.editReply(`🧹 ${u.username} sıfırlandı.`);
    } else if (interaction.commandName === 'mesai-kontrol') {
        await interaction.editReply(`📊 ${u.username} toplam ${toplamMesailer[u.id] || 0} dk.`);
    }
});

client.login(process.env.TOKEN);
