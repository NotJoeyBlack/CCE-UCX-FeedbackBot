require('dotenv').config();

// Import required classes and functions
const { Client, GatewayIntentBits, Partials, REST, Routes } = require('discord.js');

// Set your bot's client ID and token from the environment variables
const clientId = process.env.CLIENT_ID;
const token = process.env.BOT_TOKEN;
let membersWithRole = [];

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
        const roleID = "1087570706730070158";

        // Defer the reply
        await interaction.deferReply();

        const role = interaction.guild.roles.cache.get(roleID);
        if (!role) {
            return interaction.editReply(`There is no role with ID ${roleID}.`);
        }

        const membersWithRole = interaction.guild.members.cache.filter(member => member.roles.cache.has(roleID));

        await interaction.editReply(`Fetching Guild Object... Found ${membersWithRole.size} members with the specified role.`);

        console.log(`Fetching Guild Object... Found ${membersWithRole.size} members with the specified role.`);

        const dmMessage = "Hello! Please reply with your response.";

        membersWithRole.forEach(member => {
            member.send(dmMessage)
                .catch(err => console.error(`Failed to send a message to ${member.user.tag}: ${err}`));
        });

        // Edit the deferred reply with a confirmation message
        await interaction.editReply('Direct messages have been sent to the specified role members.');

        console.log("getfeedback finished");
    }
});

client.on("messageCreate", async message => {
    // Ignore messages from bots
    if (message.author.bot) return;

    console.log(`Received DM from ${message.author.tag}: ${message.content}`);
});

// Log in the bot
client.login(token);
