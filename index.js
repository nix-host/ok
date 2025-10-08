const { spawn } = require("child_process");
const path = require("path");

function start() {
    // Starts the bot in a new process using 'nix.js'
    const child = spawn("node", [path.join(__dirname, "nix.js")], {
        stdio: "inherit", // Allows child process output to appear in the parent console
        shell: true, // Executes the command in a shell, providing better compatibility
    });

    child.on("close", (code) => {
        // If the process exits with code 2, it's a signal to restart
        if (code === 2) {
            console.log("\nBot process exited due to an error. Restarting...\n");
            start();
        } else {
            console.log("Bot process exited normally.");
        }
    });

    child.on("error", (err) => {
        console.error("Failed to start subprocess:", err);
    });
}

start();
