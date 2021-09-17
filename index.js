const discord = require("discord.js");
const client = new discord.Client();
const database = require("./utils/database");
const fs = require("fs");
const chalk = require("chalk");
const options = require("./utils/config");
const usedCommand = new Set();
const runningApp = new Set();
const prefix = options.prefix;

if (!database.isInitalized) {
  database.createDatabase();
} else console.log(chalk.greenBright("Database has been loaded"));

// Obtain all the commands from ./commands folder.
client.commands = new discord.Collection();
const commandFiles = fs
  .readdirSync("./Commands")
  .filter((file) => file.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}
//

client.on("ready", () => {
  console.log(chalk.red("Bot") + chalk.green(" has logged in discord"));
  client.guilds.cache.find((ch) => {
    client.user.setActivity(ch.name, { type: "WATCHING" }).catch(console.error);
  });
});

client.on("guildMemberRemove", (member) => {
  console.log(member.user.username + " has left!");
});

client.on("guildMemberAdd", (member) => {
  console.log(member.user.username + " has joined!");
});

client.on("message", (message) => {
  if (message.channel.type == "dm") {
    return;
  }

  if (message.author.bot) {
    return;
  }

  if (!message.content.startsWith(options.prefix)) return;

  const command = message.content
    .slice(prefix.length)
    .trim()
    .split(/ +/)
    .shift()
    .toLowerCase();

  let embed = new discord.MessageEmbed();
  embed.setTimestamp();

  if (!client.commands.has(command)) return;

  const arguments = message.content.split(" ").splice(1).join(" ");

  try {
    const clientCommand = client.commands.get(command);

    if (!message.member.hasPermission("ADMINISTRATOR")) {
      if (usedCommand.has(message.author.id)) {
        options.cooldownEmbed(
          embed,
          "You are in a cooldown from running commands."
        );
        message.channel.send(embed);
        return;
      } else {
        usedCommand.add(message.author.id);
        options.wait(10000).then(() => {
          usedCommand.delete(message.author.id);
        });
      }

      if (clientCommand.adminPerms) {
        options.permissionEmbed(
          embed,
          "You do not have permission to run this command."
        );
        message.channel.send(embed);
        return;
      }
    }

    if (clientCommand.checkArgs && !arguments) {
      let error = `${options.boldWrap("Syntax:")}${options.tripleWrap(
        options.prefix + clientCommand.name + " " + clientCommand.arguments
      )}\n`;
      embed
        .setColor("#f93a2f")
        .setAuthor("⚠️ Error")
        .setDescription(error)
        .setFooter("<> = required, [] = optional");
      message.channel.send(embed);
      return;
    }

    clientCommand.execute(
      database,
      arguments,
      options,
      embed,
      message,
      client.commands,
      runningApp
    );

    if (clientCommand.sendEmbed) message.channel.send(embed);
  } catch (error) {
    console.error(error);
  }
});

client.login(options.token);
