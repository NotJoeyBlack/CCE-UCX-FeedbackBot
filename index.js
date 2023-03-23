require('dotenv').config();
const fs = require('fs');

// Import required classes and functions
const { Client, GatewayIntentBits, Partials, REST, Routes, ActionRowBuilder, StringSelectMenuBuilder, TextInputBuilder } = require('discord.js');
// Set your bot's client ID and token from the environment variables
const clientId = process.env.CLIENT_ID;
const token = process.env.BOT_TOKEN;

console.log(clientId);
console.log(token);

// Register the slash command
const commands = [
    {
        name: 'getfeedback',
        description: 'Get feedback from team captains',
    },
];

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(Routes.applicationCommands(clientId), { body: commands });
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

// Initialize the bot client
const client = new Client({
    intents: [
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildPresences
    ],
    partials: [
        Partials.Channel,
        Partials.Message
    ]
})

client.on('ready', () => {
    console.log('Bot is online!');
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'getfeedback') {
        console.log("getfeedback called");

        const roles = interaction.guild.roles.cache.map(role => ({
            label: role.name,
            value: role.id,
        }));

        const roleSelectMenu = new StringSelectMenuBuilder()
            .setCustomId('role_select_menu')
            .setPlaceholder('Select a role')
            .addOptions(roles);

        const actionRow = new ActionRowBuilder()
            .addComponents(roleSelectMenu);

        await interaction.reply({ content: 'Select a role to send feedback to:', components: [actionRow] });
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu()) return;

    const selectedRoleID = interaction.values[0];

    const role = interaction.guild.roles.cache.get(selectedRoleID);
    if (!role) {
        return interaction.reply(`There is no role with ID ${selectedRoleID}.`, { ephemeral: true });
    }

    const membersWithRole = interaction.guild.members.cache.filter(member => member.roles.cache.has(selectedRoleID));

    await interaction.reply(`Fetching Guild Object... Found ${membersWithRole.size} members with the specified role.`);

    console.log(`Fetching Guild Object... Found ${membersWithRole.size} members with the specified role.`);

    const dmMessage = `Feedback for role: ${role.name}`;

    membersWithRole.forEach(member => {
        member.send(dmMessage)
            .catch(err => console.error(`Failed to send a message to ${member.user.tag}: ${err}`));
    });

    // Edit the deferred reply with a confirmation message
    await interaction.editReply('Direct messages have been sent to the specified role members.');

    console.log("getfeedback finished");
});


client.on("messageCreate", async message => {
    // Ignore messages from bots
    if (message.author.bot) return;

    console.log(`Received DM from ${message.author.tag}: ${message.content}`);

    // Send a reply to the DM
    await message.reply('Thank you for your feedback! Your response has been recorded.');

    console.log(`Sent DM to ${message.author.tag}: Thank you for your feedback! Your response has been recorded.`);

    fs.writeFile('Feedback.txt', `Feedback from ${message.author.tag} at ${new Date(message.createdTimestamp)} - "${message.content}"\n\n`, { flag: 'a' }, function (err) {
        if (err)
            return console.log(err);
        else {
            console.log("Saved!");
        }
    });
});

// Log in the bot
client.login(token);
