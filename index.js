require('dotenv').config();
const { google } = require('googleapis');

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day}/${year} ${hours}:${minutes}`;
}

const ROLES_PER_PAGE = 10;

let currentPage = 0;

let selectedRole = null;


// Import required classes and functions
const { Client, GatewayIntentBits, PermissionsBitField, ButtonBuilder, Partials, REST, Routes, ActionRowBuilder, StringSelectMenuBuilder, SlashCommandBuilder, Events } = require('discord.js');
// Set your bot's client ID and token from the environment variables
const clientId = process.env.CLIENT_ID;
const token = process.env.BOT_TOKEN;

let globalInteraction = null;
let dmMessage = null;
let followUpMessage = null;

function createPaginationButtons(currentPage, totalPages, bShouldAddSubmitButton) {
    const prevButton = new ButtonBuilder()
        .setCustomId('prev_page')
        .setLabel('Previous')
        .setStyle('Primary')
        .setDisabled(currentPage === 0);

    const nextButton = new ButtonBuilder()
        .setCustomId('next_page')
        .setLabel('Next')
        .setStyle('Primary')
        .setDisabled(currentPage >= totalPages - 1);

    if (bShouldAddSubmitButton) {
        const submitButton = new ButtonBuilder()
            .setCustomId('submit')
            .setLabel('Submit')
            .setStyle('Success')
            .setDisabled(false);
        return new ActionRowBuilder().addComponents(prevButton, nextButton, submitButton);
    }
    else {

        return new ActionRowBuilder().addComponents(prevButton, nextButton);
    }
}

function createRoleSelectMenu(roles, page) {
    const start = page * ROLES_PER_PAGE;
    const end = start + ROLES_PER_PAGE;

    const selectMenu = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`role_select:${page}`)
                .setPlaceholder('Select a role')
                .addOptions(
                    roles.slice(start, end).map(role => ({
                        label: role.label.length > 25 ? role.label.slice(0, 22) + '...' : role.label,
                        value: role.value,
                    }))
                )
        );

    return selectMenu;
}



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
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMembers,
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

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
            return;
        }

        dmMessage = interaction.options.getString('feedbackprompt');
        followUpMessage = interaction.options.getString('followupmessage');

        await interaction.deferReply();

        globalInteraction = interaction;

        const roles = interaction.guild.roles.cache.map(role => ({
            label: role.name,
            value: role.id,
        }));

        const totalPages = Math.ceil(roles.length / ROLES_PER_PAGE);
        const currentPage = 0;

        const roleSelectMenu = createRoleSelectMenu(roles, currentPage);
        const paginationButtons = createPaginationButtons(currentPage, totalPages, false);

        await globalInteraction.editReply({ content: 'Select a role to ask for feedback from:', components: [roleSelectMenu, paginationButtons] });
    }

});

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'prev_page' || interaction.customId === 'next_page') {
        await interaction.deferUpdate();

        const roles = interaction.guild.roles.cache.map(role => ({
            label: role.name,
            value: role.id,
        }));

        const totalPages = Math.ceil(roles.length / ROLES_PER_PAGE);

        if (interaction.customId === 'prev_page') {
            currentPage--;
        } else {
            currentPage++;
        }

        const roleSelectMenu = createRoleSelectMenu(roles, currentPage);
        const paginationButtons = createPaginationButtons(currentPage, totalPages, false);

        await interaction.editReply({ components: [roleSelectMenu, paginationButtons] });
        return;
    }


    if (interaction.customId === 'submit') {

        await interaction.deferReply();

        const role = globalInteraction.guild.roles.cache.get(selectedRole);
        if (!role) {
            return globalInteraction.editReply(`There is no role with ID ${selectedRole}.`, { ephemeral: true });
        }
        console.log(`Role selected: ${role.name} (${role.id})`);

        await globalInteraction.guild.members.fetch();
        // Fetch members with the specified role
        const membersWithRole = globalInteraction.guild.members.cache.filter(member => member.roles.cache.has(role.id));

        await globalInteraction.deleteReply();

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

        // ... the rest of your code for handling other button interactions
    }
});


client.on('interactionCreate', async interaction => {
    console.log("interactionCreate string select called");
    if (!interaction.isStringSelectMenu()) return;


    if (interaction.customId !== `role_select:${currentPage}`) return;

    await interaction.deferUpdate();

    selectedRole = interaction.values[0];

    const role = globalInteraction.guild.roles.cache.get(selectedRole);

    const roles = interaction.guild.roles.cache.map(role => ({
        label: role.name,
        value: role.id,
    }));

    const totalPages = Math.ceil(roles.length / ROLES_PER_PAGE);

    const roleSelectMenu = createRoleSelectMenu(roles, currentPage);
    const paginationButtons = createPaginationButtons(currentPage, totalPages, true);

    await interaction.editReply({ content: `selected role : ${role.name}`, components: [roleSelectMenu, paginationButtons] });
    return;
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

    const auth = new google.auth.GoogleAuth({
        keyFile: 'credentials.json',
        scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });

    const client = await auth.getClient();

    const googleSheets = google.sheets({ version: 'v4', auth: client });

    const spreadsheetID = '1e2-BiQr-H2421aglpw4CNLcok285D5O88mkDN2OdbFY';

    googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId: spreadsheetID,
        range: 'Sheet1',
        valueInputOption: 'USER_ENTERED',
        resource: {
            values: [
                [`${message.author.tag}`, `${formatDate(message.createdTimestamp)}`, `${message.content}`],
            ],
        },
    });

    console.log(`Appended to Google Sheet: ${message.author.tag}, ${formatDate(message.createdTimestamp)}, ${message.content}`);
});

// Log in the bot
client.login(token);