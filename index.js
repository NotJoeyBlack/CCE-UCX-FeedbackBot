require('dotenv').config();
const fs = require('fs');

// Import required classes and functions
const { Client, GatewayIntentBits, Partials, REST, Routes, ActionRowBuilder, StringSelectMenuBuilder, SlashCommandBuilder, Events } = require('discord.js');
// Set your bot's client ID and token from the environment variables
const clientId = process.env.CLIENT_ID;
const token = process.env.BOT_TOKEN;

console.log(clientId);
console.log(token);

let globalInteraction = null;
let dmMessage = null;
let followUpMessage = null;

const data = new SlashCommandBuilder()
    .setName('getfeedback')
    .setDescription('Get feedback from a role')
    .addStringOption(option =>
        option.setName('feedbackprompt')
            .setDescription('The prompt for the feedback')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('followupmessage')
            .setDescription('Follow up question after they have reponded with feedback')
            .setRequired(false));

// Register the slash command
const commands = [data.toJSON()];

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

        dmMessage = interaction.options.getString('feedbackprompt');
        followUpMessage = interaction.options.getString('followupmessage');

        await interaction.deferReply();

        globalInteraction = interaction;

        const roles = interaction.guild.roles.cache.map(role => ({
            label: role.name,
            value: role.id,
        }));

        const roleSelectMenu = new StringSelectMenuBuilder()
            .setCustomId('role_select_menu')
            .setPlaceholder('Select a role')
            .addOptions(roles);

        const actionRow = new ActionRowBuilder()
            .addComponents(
                roleSelectMenu);

        await globalInteraction.editReply({ content: 'Select a role to send feedback to:', components: [actionRow] });

    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu()) return;

    if (interaction.customId !== 'role_select_menu') return;

    await interaction.deferReply();

    const role = globalInteraction.guild.roles.cache.get(interaction.values[0]);
    if (!role) {
        return globalInteraction.editReply(`There is no role with ID ${interaction.values[0]}.`, { ephemeral: true });
    }

    await globalInteraction.deleteReply();

    const membersWithRole = globalInteraction.guild.members.cache.filter(member => member.roles.cache.has(role.id));

    await interaction.editReply(`Fetching Guild Object... Found ${membersWithRole.size} members with the specified role.`);

    console.log(`Fetching Guild Object... Found ${membersWithRole.size} members with the specified role.`);

    membersWithRole.forEach(member => {
        member.send(dmMessage)
            .catch(err => console.error(`Failed to send a message to ${member.user.tag}: ${err}`));
    });

    // Edit the deferred reply with a confirmation message
    await interaction.editReply('Direct messages have been sent to the specified role members.');

    console.log("getfeedback finished");

    await interaction.editReply({ content: 'Request for feedback sent!' });
});


client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'Submit') return;

    interaction.deferReply();

    const role = globalInteraction.guild.roles.cache.get(FinalRoleID);
    if (!role) {
        return globalInteraction.editReply(`There is no role with ID ${FinalRoleID}.`, { ephemeral: true });
    }

    await globalInteraction.deleteReply();

    const membersWithRole = globalInteraction.guild.members.cache.filter(member => member.roles.cache.has(FinalRoleID));

    await interaction.editReply(`Fetching Guild Object... Found ${membersWithRole.size} members with the specified role.`);

    console.log(`Fetching Guild Object... Found ${membersWithRole.size} members with the specified role.`);

    const dmMessage = `Feedback for role: ${role.name}`;

    membersWithRole.forEach(member => {
        member.send(dmMessage)
            .catch(err => console.error(`Failed to send a message to ${member.user.tag}: ${err}`));
    });

    // Edit the deferred reply with a confirmation message
    await interaction.editReply('Direct messages have been sent to the specified role members.');

    console.log("getfeedback finished");

    await interaction.editReply({ content: 'Request for feedback sent!' });
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'Cancel') return;

    interaction.deferReply();

    globalInteraction.deleteReply();

    interaction.deleteReply();
});

client.on("messageCreate", async message => {
    // Ignore messages from bots
    if (message.author.bot) return;

    console.log(`Received DM from ${message.author.tag}: ${message.content}`);

    // Send a reply to the DM
    if (followUpMessage != null)
        await message.reply(followUpMessage);
    else
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