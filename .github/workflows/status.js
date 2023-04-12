module.exports = async ({github, context, core, diff}) => {
    const fs = require('fs');

    const errors = [];
    const addError = (error) => {
        errors.push(`:x: ${error}`);
        console.log('Found issue: ' + error);
    };

    const warnings = [];
    const addWarning = (warning) => {
        warnings.push(`:warning: ${warning}`);
        console.log('Found issue: ' + warning);
    }

    if (context.payload.pull_request.changed_files > 1) {
        addError('You modified more than one file');
    }

    const english = JSON.parse(fs.readFileSync('en.json', 'utf8'));

    const pr = context.payload.pull_request.number;

    // todo: update owner before PR
    const files = await github.rest.pulls.listFiles({owner: "joethei", repo: "obsidian-translations", pull_number: pr});

    for (const file in files) {
        try {
            const raw = fetch(file.raw_url);
            const parsed = JSON.parse(raw);
            
            const diffe = diff.getDiff(english, parsed, true);
            console.log(diffe);
            
        } catch (e) {
            addError('Could not retrieve or parse translated file');
        }

    }

    if (errors.length > 0 || warnings.length > 0) {
        let message = [`#### Hello!\n`];
        message.push(`**I found the following issues in your translation**\n`);
        if (errors.length > 0) {
            message.push(`**Errors:**\n`);
            message = message.concat(errors);
            message.push(`\n---\n`);
        }
        if (warnings.length > 0) {
            message.push(`**Warnings:**\n`);
            message = message.concat(warnings);
            message.push(`\n---\n`);
        }
        message.push(`<sup>This check was done automatically. Do <b>NOT</b> open a new PR for re-validation. Instead, to trigger this check again, make a change to your PR and wait a few minutes, or close and re-open it.</sup>`);


        await github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: "joethei",
            repo: "obsidian-translations",
            body: message
        });
        core.setFailed("Failed to validate theme");
    }
}