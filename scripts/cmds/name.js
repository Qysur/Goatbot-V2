
module.exports = {
  config: {
    name: "name",
    aliases: ["nameall"],
    version: "1.0.0",
    author: "Bassit",
    countDown: 5,
    role: 0,
    description: "Change the current group name or all group names",
    category: "box chat",
    usePrefix: true
  },

  onStart: async function ({ api, event, args, message, usersData }) {
    const commandName = event.body
      .trim()
      .split(/\s+/)[0]
      .replace(/^[^a-zA-Z0-9]+/, "")
      .toLowerCase();

    const newName = args.join(" ").trim();

    if (!newName) {
      return message.reply(
        "❌ Enter a new group name.\n\n" +
        "Current group: name New Name\n" +
        "All groups: nameall New Name"
      );
    }

    const botConfig = global.GoatBot?.config || {};
    const admins = (botConfig.adminBot || []).map(String);
    const senderID = String(event.senderID);

    if (commandName === "nameall" && !admins.includes(senderID)) {
      return message.reply(
        "❌ Only the bot administrator can use nameall."
      );
    }

    if (commandName !== "nameall") {
      try {
        await api.setTitle(newName, event.threadID);
        return message.reply(
          `✅ Group name updated to:\n${newName}`
        );
      } catch (err) {
        console.error("[NAME]", err);
        return message.reply(
          "❌ Failed to change this group's name. Check the bot's permissions."
        );
      }
    }

    let threadList;

    try {
      threadList = await api.getThreadList(100, null, ["INBOX"]);
    } catch (err) {
      console.error("[NAMEALL LIST]", err);
      return message.reply("❌ Failed to retrieve the group list.");
    }

    const groups = threadList.filter(
      thread =>
        thread.isGroup &&
        thread.threadID &&
        String(thread.threadID) !== String(event.threadID)
    );

    // تضمين المجموعة الحالية أيضاً
    groups.unshift({
      threadID: event.threadID,
      name: "Current group"
    });

    let success = 0;
    let failed = 0;

    await message.reply(
      `⏳ Updating group names...\nGroups found: ${groups.length}`
    );

    for (const group of groups) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await api.setTitle(newName, group.threadID);
        success++;
      } catch (err) {
        failed++;
        console.error(
          `[NAMEALL] ${group.threadID}:`,
          err.message || err
        );
      }
    }

    return message.reply(
      `📋 NAMEALL RESULTS\n\n` +
      `✅ Updated: ${success}\n` +
      `❌ Failed: ${failed}\n` +
      `📝 New name: ${newName}`
    );
  }
};
