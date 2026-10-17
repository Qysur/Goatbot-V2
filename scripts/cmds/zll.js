
const fs = require("fs-extra");

const activeTasks = new Map();
const MAX_REPEAT = 20;

module.exports = {
  config: {
    name: "zll",
    aliases: [],
    version: "1.0.0",
    author: "Bassit",
    countDown: 3,
    role: 0,
    description: "Repeat a message with a delay",
    category: "utility",
    usePrefix: true
  },

  onStart: async function ({ api, event, args, message }) {
    const threadID = String(event.threadID);
    const action = (args[0] || "").toLowerCase();

    if (action === "off") {
      const task = activeTasks.get(threadID);

      if (task) {
        task.stopped = true;
        activeTasks.delete(threadID);
      }

      return message.reply(
        task
          ? "✅ ZLL stopped."
          : "ℹ️ No active ZLL task."
      );
    }

    if (action !== "on") {
      return message.reply(
        "📌 ZLL USAGE\n\n" +
        "Reply to a message:\n" +
        "zll on 2 10\n\n" +
        "Repeat custom text:\n" +
        "zll on 2 10 Hello\n\n" +
        "Stop:\n" +
        "zll off\n\n" +
        `Maximum: ${MAX_REPEAT} repetitions per task.`
      );
    }

    if (activeTasks.has(threadID)) {
      return message.reply(
        "⚠️ A ZLL task is already running. Use zll off first."
      );
    }

    const delaySeconds = Number(args[1]);
    const count = Number(args[2]);
    const customText = args.slice(3).join(" ").trim();

    if (
      !Number.isFinite(delaySeconds) ||
      delaySeconds < 1 ||
      delaySeconds > 60 ||
      !Number.isInteger(count) ||
      count < 1 ||
      count > MAX_REPEAT
    ) {
      return message.reply(
        `❌ Invalid settings.\n` +
        `Delay: 1–60 seconds.\n` +
        `Count: 1–${MAX_REPEAT}.`
      );
    }

    let textToRepeat = customText;

    if (!textToRepeat && event.messageReply) {
      textToRepeat = event.messageReply.body || "";
    }

    if (!textToRepeat) {
      return message.reply(
        "❌ Reply to a text message or provide custom text."
      );
    }

    const task = { stopped: false };
    activeTasks.set(threadID, task);

    await message.reply(
      `✅ ZLL started.\n` +
      `🔁 Count: ${count}\n` +
      `⏱️ Delay: ${delaySeconds}s\n` +
      `🛑 Stop: zll off`
    );

    try {
      for (let i = 0; i < count; i++) {
        if (
          task.stopped ||
          activeTasks.get(threadID) !== task
        ) {
          break;
        }

        await new Promise((resolve) => {
          api.sendMessage(textToRepeat, threadID, resolve);
        });

        if (i < count - 1 && !task.stopped) {
          await new Promise(resolve =>
            setTimeout(resolve, delaySeconds * 1000)
          );
        }
      }
    } catch (err) {
      console.error("[ZLL]", err);
    } finally {
      if (activeTasks.get(threadID) === task) {
        activeTasks.delete(threadID);
      }
    }

    if (!task.stopped) {
      await message.reply("✅ ZLL finished.");
    }
  }
};
