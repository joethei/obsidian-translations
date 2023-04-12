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

    const files = await github.rest.pulls.listFiles({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: context.issue.number
    });

    let stats;
    let prStats;
    for (const file of files.data) {
        let raw;
        try {
            raw = await github.request(file.raw_url);
            prStats = {
                additions: file.additions,
                deletions: file.deletions,
                changes: file.changes,
            }
        } catch (e) {
            console.error(e);
            addError('Could not retrieve translated file');
        }
        try {
            if (raw !== undefined) {
                const parsed = JSON.parse(raw.data);

                const diffe = diff.getDiff(english, parsed, true);
                stats = {
                    added: diffe.added.length,
                    removed: diffe.removed.length,
                    edited: diffe.edited.length,
                };
            }
        } catch (e) {
            console.error(e);
            addError('Could not parse translated file');
        }

    }
    let message = [`#### Hello!\n`];

    if (errors.length > 0 || warnings.length > 0) {

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
    }
    console.log(stats);
    console.log(prStats);
    message.push(`Some stats:\n - Added: ${prStats.additions}\n - Removed: ${prStats.deletions}\n - Changed ${prStats.changes}`);
    message.push(`more stats:\n - Added: ${stats.added}\n - Removed: ${stats.removed}\n - Changed ${stats.edited}`);

    await github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: message
    });



}